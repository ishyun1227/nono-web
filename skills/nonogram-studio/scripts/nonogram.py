#!/usr/bin/env python3
"""Deterministic nonogram image conversion, exact uniqueness, propagation, previews.

Requires Pillow, numpy, scipy. No image-generation API dependency.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
import time
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


def clue_for_line(line):
    runs, length = [], 0
    for x in list(line) + [0]:
        if x:
            length += 1
        elif length:
            runs.append(length)
            length = 0
    return runs or [0]


def derive_clues(grid):
    a = np.asarray(grid, dtype=np.uint8)
    return ([clue_for_line(a[r, :]) for r in range(a.shape[0])],
            [clue_for_line(a[:, c]) for c in range(a.shape[1])])


def normalize_clue(clue):
    seq = [int(x) for x in clue]
    if seq == [0] or not seq:
        return []
    if any(x <= 0 for x in seq):
        raise ValueError(f'Invalid clue {clue}')
    return seq


def validate_clues(rows, cols):
    h, w = len(rows), len(cols)
    if not h or not w:
        raise ValueError('Empty clues')
    for clues, n in ((rows, w), (cols, h)):
        for c in clues:
            runs = normalize_clue(c)
            if sum(runs) + max(0, len(runs) - 1) > n:
                raise ValueError(f'Clues cannot fit length {n}: {c}')
    if sum(sum(normalize_clue(c)) for c in rows) != sum(sum(normalize_clue(c)) for c in cols):
        raise ValueError('Row/column black counts differ')


def exact_uniqueness(rows, cols, reference=None, time_limit=12.0):
    """Find second distinct solution to reference (known-valid), via exact MILP.

    Returns status unique|multiple|unknown|invalid; exact uniqueness only if
    HiGHS proves infeasibility of exclusion model.
    """
    validate_clues(rows, cols)
    from scipy.optimize import milp, Bounds, LinearConstraint
    from scipy.sparse import coo_matrix
    h, w = len(rows), len(cols)
    if reference is None:
        return {'status': 'invalid', 'reason': 'Reference grid required'}
    a = np.asarray(reference, dtype=np.uint8)
    if a.shape != (h, w) or derive_clues(a) != (rows, cols):
        return {'status': 'invalid', 'reason': 'Reference grid does not match clues'}
    n_cell = h * w
    variables = n_cell
    # Sparse constraints rows defined as coefficient dictionaries
    eqs = []
    low, high = [], []

    def add(coeffs, lb, ub):
        eqs.append(coeffs)
        low.append(float(lb)); high.append(float(ub))

    def process_line(cell_idxs, clue):
        nonlocal variables
        length = len(cell_idxs)
        runs = normalize_clue(clue)
        if not runs:
            for idx in cell_idxs:
                add({idx: 1}, 0, 0)
            return
        k = len(runs)
        run_options = []
        for j, run_length in enumerate(runs):
            earliest = sum(runs[:j]) + j
            latest = length - sum(runs[j:]) - (k - 1 - j)
            options = {}
            for start in range(earliest, latest + 1):
                options[start] = variables
                variables += 1
            run_options.append(options)
            add({vid: 1 for vid in options.values()}, 1, 1)
        for j in range(k - 1):
            coeffs = {}
            for start, vid in run_options[j + 1].items():
                coeffs[vid] = coeffs.get(vid, 0) + start
            for start, vid in run_options[j].items():
                coeffs[vid] = coeffs.get(vid, 0) - start
            add(coeffs, runs[j] + 1, np.inf)
        # For a fixed line position, x=1 iff covered by a selected run
        for pos, cell_idx in enumerate(cell_idxs):
            coeffs = {cell_idx: 1}
            for j, run_length in enumerate(runs):
                for start, vid in run_options[j].items():
                    if start <= pos < start + run_length:
                        coeffs[vid] = -1
            add(coeffs, 0, 0)

    for r in range(h):
        process_line([r * w + c for c in range(w)], rows[r])
    for c in range(w):
        process_line([r * w + c for r in range(h)], cols[c])

    # Exclude exactly the supplied grid. Any feasible model = a second answer.
    ref_flat = a.reshape(-1)
    coeffs = {int(i): (-1 if ref_flat[i] else 1) for i in range(n_cell)}
    add(coeffs, 1 - int(ref_flat.sum()), np.inf)
    ri, ci, data = [], [], []
    for i, mapping in enumerate(eqs):
        for j, v in mapping.items():
            if v:
                ri.append(i); ci.append(j); data.append(float(v))
    A = coo_matrix((data, (ri, ci)), shape=(len(eqs), variables)).tocsr()
    try:
        res = milp(c=np.zeros(variables), integrality=np.ones(variables, dtype=int),
                   bounds=Bounds(np.zeros(variables), np.ones(variables)),
                   constraints=LinearConstraint(A, np.array(low), np.array(high)),
                   options={'time_limit': max(float(time_limit), 0.1), 'mip_rel_gap': 0.0})
    except Exception as exc:
        return {'status': 'unknown', 'reason': f'MILP execution error: {exc}'}
    if res.status == 2:
        return {'status': 'unique', 'method': 'MILP proof by excluding reference'}
    if res.status == 0 and res.x is not None:
        alt = (res.x[:n_cell].reshape((h, w)) > .5).astype('uint8')
        if derive_clues(alt) == (rows, cols) and not np.array_equal(alt, a):
            return {'status': 'multiple', 'alternative': alt.tolist(), 'method': 'MILP second witness'}
        return {'status': 'unknown', 'reason': 'Solver returned invalid alternative'}
    return {'status': 'unknown', 'reason': f'MILP ended without proof (status={res.status}, {res.message})'}


def line_forced(length, clue, known):
    """Exact domain projection for one line via memoized run placements.

    known entries: -1 undecided, 0 white, 1 black; returns bitmask for
    possible_black, forced_black, or None if contradictory.
    """
    runs = normalize_clue(clue)
    kb = sum(1 << i for i, v in enumerate(known) if v == 1)
    kw = sum(1 << i for i, v in enumerate(known) if v == 0)
    all_bits = (1 << length) - 1
    if not runs:
        return None if kb else (0, 0)
    k = len(runs)
    suffix = [0] * (k + 1)
    for j in range(k-1, -1, -1):
        suffix[j] = suffix[j+1] + runs[j]

    @lru_cache(None)
    def dp(j, min_start):
        if j == k:
            remaining = all_bits ^ ((1 << min_start) - 1)
            return (0, 0) if not (remaining & kb) else None
        latest = length - suffix[j] - (k-j-1)
        union, intersection, valid = 0, all_bits, False
        for p in range(min_start, latest + 1):
            gap = ((1 << p)-1) ^ ((1 << min_start)-1)
            fill = ((1 << runs[j])-1) << p
            if (gap & kb) or (fill & kw):
                continue
            after = p + runs[j]
            if j < k-1 and (kb & (1 << after)):
                continue
            tail = dp(j + 1, after + (1 if j < k-1 else 0))
            if tail is None:
                continue
            possible, forced = tail
            sub_union, sub_intersection = fill | possible, fill | forced
            union |= sub_union
            intersection &= sub_intersection
            valid = True
        return (union, intersection) if valid else None
    return dp(0, 0)


def logic_trace(rows, cols, max_rounds=250):
    validate_clues(rows, cols)
    h, w = len(rows), len(cols)
    cells = np.full((h, w), -1, dtype=np.int8)
    changes = []
    for step in range(max_rounds):
        count = 0
        for axis, all_clues, n in [('row', rows, w), ('col', cols, h)]:
            for pos, clue in enumerate(all_clues):
                a = cells[pos, :] if axis == 'row' else cells[:, pos]
                result = line_forced(n, clue, a.tolist())
                if result is None:
                    return {'status': 'contradiction', 'rounds': step+1, 'unknown_cells': int((cells == -1).sum()), 'changes': changes}
                may_black, must_black = result
                for idx in range(n):
                    desired = 1 if must_black & (1 << idx) else (0 if not may_black & (1 << idx) else -1)
                    if desired == -1:
                        continue
                    if a[idx] == -1:
                        a[idx] = desired
                        count += 1
                    elif a[idx] != desired:
                        return {'status': 'contradiction', 'rounds': step+1, 'unknown_cells': int((cells == -1).sum()), 'changes': changes}
        changes.append(count)
        if not count:
            break
    unknown = int((cells == -1).sum())
    return {'status': 'solved_by_line_propagation' if unknown == 0 else 'stalled',
            'rounds': len(changes), 'unknown_cells': unknown, 'changes': changes,
            'note': 'Line-overlap propagation only; a stall does not prove the puzzle requires guessing.'}


def prepare_source(path, margin=.015):
    original = Image.open(path).convert('RGBA')
    rgba = np.asarray(original).copy()
    # White composite: RGBA including transparent margins
    alpha = rgba[:, :, 3:4].astype(np.float32) / 255.0
    rgb = np.round(rgba[:, :, :3].astype(np.float32) * alpha + 255 * (1 - alpha)).astype(np.uint8)
    grey = np.asarray(Image.fromarray(rgb).convert('L'))
    foreground = grey < 230
    if not foreground.any():
        raise ValueError('No nonwhite subject found in source image')
    yy, xx = np.where(foreground)
    xmin, xmax, ymin, ymax = int(xx.min()), int(xx.max()) + 1, int(yy.min()), int(yy.max()) + 1
    crop = Image.fromarray(grey).crop((xmin, ymin, xmax, ymax))
    side = max(crop.size)
    pad = max(2, math.ceil(side * margin))
    square = Image.new('L', (side + 2*pad, side+2*pad), 255)
    square.paste(crop, ((square.width-crop.width)//2, (square.height-crop.height)//2))
    arr = (np.asarray(square) < 185).astype(np.uint8)
    return arr, {'original_size': original.size, 'bounding_box': [xmin,ymin,xmax,ymax], 'normalized_size': square.size,
                 'margin_ratio': margin}


def candidate_grid(source, n, threshold, interpolation):
    img = Image.fromarray((255 * (1 - source)).astype('uint8'))
    interp = Image.Resampling.BOX if interpolation == 'box' else Image.Resampling.LANCZOS
    small = np.asarray(img.resize((n, n), interp))
    return (small < threshold).astype(np.uint8)


def masks_iou(a, b):
    intersection = np.logical_and(a, b).sum()
    union = np.logical_or(a, b).sum()
    return round(float(intersection / union) if union else 1., 4)


def hotspot_metrics(src, grid, specs):
    n = grid.shape[0]
    up = np.asarray(Image.fromarray(grid * 255).resize((src.shape[1], src.shape[0]), Image.Resampling.NEAREST)) > 127
    data = {}
    for name, (x1, y1, x2, y2) in specs.items():
        h, w = src.shape
        xa, xb = max(0, int(w*x1)), min(w, int(math.ceil(w*x2)))
        ya, yb = max(0, int(h*y1)), min(h, int(math.ceil(h*y2)))
        if xb <= xa or yb <= ya:
            raise ValueError(f'Empty hotspot {name}')
        target = src[ya:yb, xa:xb].astype(bool)
        result = up[ya:yb, xa:xb]
        iou = masks_iou(target, result)
        data[name] = {'iou': iou, 'pixel_retention_proxy': iou >= 0.62,
                      'note': 'A local IoU threshold is not proof of semantic feature fidelity.'}
    return data


def choose_font(size, bold=False):
    path = '/usr/share/fonts/truetype/dejavu/DejaVuSans'+('-Bold' if bold else '')+'.ttf'
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def render_solution(grid, path, cell=18, lines=True):
    h, w = grid.shape
    img = Image.new('RGB', (w*cell+1, h*cell+1), '#FFFFFF')
    d = ImageDraw.Draw(img)
    for y in range(h):
        for x in range(w):
            if grid[y, x]:
                d.rectangle((x*cell,y*cell,(x+1)*cell-1,(y+1)*cell-1), fill='#111111')
    if lines:
        for x in range(w+1):
            d.line((x*cell,0,x*cell,h*cell), fill='#8f8f8f',width=2 if x%5==0 else 1)
        for y in range(h+1):
            d.line((0,y*cell,w*cell,y*cell), fill='#8f8f8f',width=2 if y%5==0 else 1)
    img.save(path)


def render_sheet(grid, rows, cols, path, cell=23):
    h, w = grid.shape
    maxr = max(len(c) for c in rows)
    maxc = max(len(c) for c in cols)
    font = choose_font(max(11, min(15, cell-8)), True)
    label_step = max(24, cell)
    lx, ty = 32 + maxr * label_step, 38 + maxc * label_step
    img = Image.new('RGB',(lx+w*cell+24,ty+h*cell+24),'white')
    d = ImageDraw.Draw(img)
    for i, clue in enumerate(rows):
        for j, x in enumerate(reversed(clue)):
            text = str(x)
            bbox = d.textbbox((0,0),text,font=font)
            width,height=bbox[2]-bbox[0],bbox[3]-bbox[1]
            d.text((lx-(j+1)*label_step+label_step//2-width//2-1,ty+i*cell+cell//2-height//2-2),text,fill='black',font=font)
    for i, clue in enumerate(cols):
        for j, x in enumerate(reversed(clue)):
            text=str(x)
            bbox=d.textbbox((0,0),text,font=font)
            width,height=bbox[2]-bbox[0],bbox[3]-bbox[1]
            d.text((lx+i*cell+cell//2-width//2-1,ty-(j+1)*label_step+label_step//2-height//2-2),text,fill='black',font=font)
    for i in range(w+1):
        d.line((lx+i*cell,ty,lx+i*cell,ty+h*cell),fill='#404040',width=2 if i%5==0 else 1)
    for i in range(h+1):
        d.line((lx,ty+i*cell,lx+w*cell,ty+i*cell),fill='#404040',width=2 if i%5==0 else 1)
    img.save(path)


def comparison(source, grid, path, specs):
    side=570
    a = Image.fromarray((255*(1-source)).astype('uint8')).resize((side,side),Image.Resampling.NEAREST).convert('RGB')
    b = Image.fromarray((255*(1-grid)).astype('uint8')).resize((side,side),Image.Resampling.NEAREST).convert('RGB')
    out=Image.new('RGB',(side*2,side+38),'white')
    out.paste(a,(0,38)); out.paste(b,(side,38))
    d=ImageDraw.Draw(out)
    font=choose_font(19,True)
    d.text((8,8),'Source art',fill='black',font=font)
    d.text((side+8,8),f'{grid.shape[0]}x{grid.shape[1]} answer pixels',fill='black',font=font)
    for name, (x1,y1,x2,y2) in specs.items():
        for dx in (0,side):
            d.rectangle((dx+int(x1*side),38+int(y1*side),dx+int(x2*side),38+int(y2*side)),outline='#d32f2f',width=3)
    out.save(path)


def parse_hotspots(items):
    res={}
    for item in items:
        sections=item.split(':')
        if len(sections)!=5:
            raise ValueError('Hotspot needs name:x1:y1:x2:y2, coordinates normalized to source square')
        name=sections[0]
        vals=tuple(float(x) for x in sections[1:])
        if not (0<=vals[0]<vals[2]<=1 and 0<=vals[1]<vals[3]<=1):
            raise ValueError('Hotspot bounds must satisfy 0<=left<right<=1, etc.')
        res[name]=vals
    return res


def safe_local_repairs(source, grid, size, threshold, interp, hotspots, limit=14):
    """Generate bounded non-random single-cell edge fixes.

    Does not claim semantic reconstruction or guaranteed uniqueness. Never alter
    an explicitly marked identity-critical hotspot; user/agent can inspect edits.
    """
    img = Image.fromarray((255 * (1-source)).astype('uint8'))
    method = Image.Resampling.BOX if interp == 'box' else Image.Resampling.LANCZOS
    grey = np.asarray(img.resize((size,size),method),dtype=float)
    options=[]
    for r in range(size):
        for c in range(size):
            # Do not edit marked semantically important detail.
            if any(x1 <= (c+.5)/size <= x2 and y1 <= (r+.5)/size <= y2
                   for x1,y1,x2,y2 in hotspots.values()):
                continue
            near=grid[max(0,r-1):min(size,r+2),max(0,c-1):min(size,c+2)]
            neighbor_black=int(near.sum())-int(grid[r,c])
            if not 1 <= neighbor_black <= 7:
                continue
            uncertainty=abs(grey[r,c]-threshold)
            options.append((uncertainty, r,c))
    options.sort()
    for _,r,c in options[:limit]:
        patched=grid.copy()
        patched[r,c]=1-patched[r,c]
        yield patched,(int(r),int(c))


def build(args):
    dest = Path(args.output); dest.mkdir(parents=True,exist_ok=True)
    source,meta = prepare_source(args.image, margin=args.margin)
    Image.fromarray(255*(1-source)).convert('L').save(dest/'source_binary.png')
    specs=parse_hotspots(args.hotspot)
    sizes = list(dict.fromkeys(int(x) for x in args.sizes.split(',') if x.strip()))
    if not sizes or any(n<5 or n>100 for n in sizes):
        raise ValueError('Grid sizes must be in 5..100')
    examined=[]
    winner=None; best=None
    began=time.monotonic()
    attempt_number=0
    for n in sizes:
        for threshold in [155,185,210]:
            for interp in ['box','lanczos']:
                if attempt_number >= args.max_candidates: break
                attempt_number+=1
                grid=candidate_grid(source,n,threshold,interp)
                iou=masks_iou(source.astype(bool),
                    np.asarray(Image.fromarray(grid*255).resize(source.shape[::-1],Image.Resampling.NEAREST))>127)
                hot=hotspot_metrics(source,grid,specs)
                hot_ok=all(x['pixel_retention_proxy'] for x in hot.values())
                rows,cols=derive_clues(grid)
                data={'size':n, 'threshold':threshold,'interpolation':interp,'global_iou':iou,
                      'hotspots':hot,'hotspots_pass_proxy':hot_ok,'filled_cells':int(grid.sum())}
                # Do not spend solver time on already rejected visually weak candidate.
                if iou < args.min_iou or not hot_ok:
                    data.update({'uniqueness':'skipped_visual_proxy_failure','logic':'not_run'})
                else:
                    check=exact_uniqueness(rows,cols,grid,time_limit=args.solver_seconds)
                    data['uniqueness']=check['status']
                    if check['status']=='multiple':
                        data['alternative_solution_exists']=True
                    if check['status']=='unique':
                        trace=logic_trace(rows,cols)
                        data['logic']=trace
                    else:
                        data['logic']='not_run'
                examined.append(data)
                print(f"[{attempt_number}/{args.max_candidates}] {n}x{n} {interp}/{threshold} quality={iou:.3f} uniqueness={data['uniqueness']}",flush=True)
                key=(data.get('uniqueness')=='unique', data.get('logic',{}).get('status')=='solved_by_line_propagation' if isinstance(data.get('logic'),dict) else False, hot_ok, iou)
                if best is None or key>best[0]: best=(key,grid,data)
                if data.get('uniqueness')=='unique' and hot_ok and iou>=args.min_iou:
                    winner=(grid,data)
                    break
            if winner or attempt_number>=args.max_candidates: break
        if winner or attempt_number>=args.max_candidates: break
    # Local repair is a real bounded retry, not a decorative promise.
    if winner is None and best is not None and args.repair_trials:
        original_grid, baseline = best[1], best[2]
        if baseline.get('uniqueness') == 'multiple' and baseline['hotspots_pass_proxy']:
            for grid2, location in safe_local_repairs(source, original_grid,
                        baseline['size'], baseline['threshold'], baseline['interpolation'],
                        specs, limit=args.repair_trials):
                repair_iou=masks_iou(source.astype(bool),
                    np.asarray(Image.fromarray(grid2*255).resize(source.shape[::-1],Image.Resampling.NEAREST))>127)
                if repair_iou < args.min_iou or repair_iou < baseline['global_iou']-.025:
                    continue
                h2=hotspot_metrics(source,grid2,specs)
                if not all(d['pixel_retention_proxy'] for d in h2.values()):
                    continue
                rr,cc=derive_clues(grid2)
                u=exact_uniqueness(rr,cc,grid2,time_limit=args.solver_seconds)
                repair={'size':baseline['size'],'threshold':baseline['threshold'],
                        'interpolation':baseline['interpolation'],'global_iou':repair_iou,
                        'hotspots':h2,'hotspots_pass_proxy':True,
                        'filled_cells':int(grid2.sum()),'uniqueness':u['status'],
                        'edit':{'type':'single_edge_cell_flip','row':location[0],'col':location[1]}}
                if u['status']=='unique':
                    repair['logic']=logic_trace(rr,cc)
                    winner=(grid2,repair)
                    examined.append(repair)
                    print(f'[repair] edge cell {location} established uniqueness',flush=True)
                    break
                examined.append(repair)
    if winner is None:
        grid,data=best[1],best[2]
        status='NEEDS_SOURCE_REDESIGN_OR_MORE_TRIALS' if not data['hotspots_pass_proxy'] or data['global_iou']<args.min_iou else 'NOT_VALIDATED'
    else:
        grid,data=winner
        status='REQUIRES_VISUAL_REVIEW' if specs else 'REQUIRES_VISUAL_REVIEW_NO_HOTSPOTS'
    rows,cols=derive_clues(grid)
    render_solution(grid,dest/'answer.png')
    render_sheet(grid,rows,cols,dest/'puzzle.png')
    comparison(source,grid,dest/'comparison.png',specs)
    raw={'size':list(grid.shape),'grid':grid.tolist(),'rows':rows,'cols':cols,
         'candidate':data,'source_path':str(args.image)}
    (dest/'puzzle.json').write_text(json.dumps(raw,ensure_ascii=False,indent=2),encoding='utf8')
    failing_hotspots=[name for name,detail in data.get('hotspots',{}).items()
                      if not detail['pixel_retention_proxy']]
    if status.startswith('NEEDS_SOURCE'):
        next_action='Return to host image editor: redesign critical source shapes, then rerun build.'
    elif status=='NOT_VALIDATED':
        next_action='Do not publish: inspect answer/hotspots; try additional sizes or source redesign, then rerun uniqueness proof.'
    else:
        next_action='Agent/user must inspect comparison and hotspot semantics before accepting as finished.'
    report={'status':status,'selected':data,'examined':examined,'source_metadata':meta,
      'candidate_count':len(examined),'runtime_seconds':round(time.monotonic()-began,3),
      'failing_hotspots':failing_hotspots,'next_action':next_action,
      'quality_warning':'Pixel IoU and hotspot crops are proxies; agent/user must inspect actual semantic fidelity.',
      'workflow_warning':'Script cannot invoke image generation; regenerate source through an image tool if source redesign is needed.',
      'uniqueness_warning':'Only status unique from MILP infeasibility is an exact uniqueness proof; timeout is unverified.',
      'difficulty_warning':'Line propagation is a partial logic check, not a complete human enjoyment score.'}
    (dest/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps({'status':status,'selected_size':data['size'],'uniqueness':data['uniqueness'],
                      'out':str(dest),'candidates':len(examined)},ensure_ascii=False))
    return 0 if winner else 2


def verify(args):
    obj=json.loads(Path(args.json).read_text(encoding='utf8'))
    rows,cols=obj['rows'],obj['cols']
    grid=np.array(obj['grid'],dtype=np.uint8)
    if derive_clues(grid)!=(rows,cols):
        print(json.dumps({'status':'invalid','reason':'Grid/clues mismatch'}))
        return 2
    result=exact_uniqueness(rows,cols,grid,args.solver_seconds)
    result.pop('alternative',None)
    result['line_logic']=logic_trace(rows,cols)
    print(json.dumps(result,ensure_ascii=False))
    return 0 if result['status']=='unique' else 2


def main(argv=None):
    p=argparse.ArgumentParser(description='Integrated nonogram conversion, exact uniqueness and quality preview')
    sub=p.add_subparsers(dest='command',required=True)
    b=sub.add_parser('build',help='Build from source art; automatic conversion variant retries')
    b.add_argument('--image',required=True)
    b.add_argument('--output',required=True)
    b.add_argument('--sizes',default='25,30,35,40,45')
    b.add_argument('--hotspot',action='append',default=[],help='name:x1:y1:x2:y2 normalized to square source')
    b.add_argument('--max-candidates',type=int,default=12)
    b.add_argument('--solver-seconds',type=float,default=8.0)
    b.add_argument('--min-iou',type=float,default=0.62)
    b.add_argument('--margin',type=float,default=0.015,help='White border around detected subject, fraction of subject size')
    b.add_argument('--repair-trials',type=int,default=12,help='Bounded edge-cell repair tries if puzzle has multiple solutions')
    v=sub.add_parser('verify',help='Re-check exact uniqueness of exported puzzle.json')
    v.add_argument('--json',required=True)
    v.add_argument('--solver-seconds',type=float,default=20.0)
    args=p.parse_args(argv)
    try:
        return build(args) if args.command=='build' else verify(args)
    except (ValueError,FileNotFoundError) as e:
        print(f'ERROR: {e}',file=sys.stderr)
        return 2


if __name__=='__main__':
    sys.exit(main())
