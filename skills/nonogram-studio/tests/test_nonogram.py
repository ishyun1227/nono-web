import sys
import itertools
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1] / 'scripts'))
from nonogram import derive_clues, exact_uniqueness, line_forced, logic_trace, masks_iou, parse_hotspots, hotspot_metrics, render_sheet, render_solution, validate_clues, safe_local_repairs

class NonogramTests(unittest.TestCase):
    def test_clue_generation(self):
        a=np.array([[1,1,0,1,0],[0,0,0,0,0],[1,1,1,0,1]],dtype=np.uint8)
        rows,cols=derive_clues(a)
        self.assertEqual(rows,[[2,1],[0],[3,1]])
        self.assertEqual(cols,[[1,1],[1,1],[1],[1],[1]])

    def test_unique(self):
        a=np.array([[1,1,0],[1,1,0],[0,0,0]],dtype=np.uint8)
        self.assertEqual(exact_uniqueness(*derive_clues(a),a,4)['status'],'unique')

    def test_ambiguous(self):
        a=np.eye(2,dtype=np.uint8)
        result=exact_uniqueness(*derive_clues(a),a,4)
        self.assertEqual(result['status'],'multiple')
        self.assertNotEqual(result['alternative'],a.tolist())

    def test_solver_line_forced(self):
        self.assertEqual(line_forced(5,[5],[-1]*5),(31,31))
        self.assertEqual(line_forced(5,[0],[-1]*5),(0,0))
        self.assertEqual(line_forced(5,[3],[-1]*5),(31,4))
        self.assertIsNone(line_forced(3,[3],[0,-1,-1]))

    def test_line_logic(self):
        a=np.array([[1,1,0],[1,1,0],[0,0,0]],dtype=np.uint8)
        result=logic_trace(*derive_clues(a))
        self.assertEqual(result['status'],'solved_by_line_propagation')

    def test_invalid(self):
        with self.assertRaises(ValueError):
            validate_clues([[3]],[[1],[0]])

    def test_hotspot(self):
        a=np.zeros((10,10),dtype=np.uint8)
        a[1:9,2:8]=1
        m=hotspot_metrics(a,a.copy(),{'shape':(.1,.1,.9,.9)})
        self.assertEqual(m['shape']['iou'],1)

    def test_safe_local_repair(self):
        a=np.eye(2,dtype=np.uint8)
        trials=list(safe_local_repairs(a,a,2,155,'box',{},limit=4))
        self.assertGreaterEqual(len(trials),1)
        self.assertTrue(any(exact_uniqueness(*derive_clues(g),g,4)['status']=='unique' for g,_ in trials))
        no_edits=list(safe_local_repairs(a,a,2,155,'box',{'critical':(0,0,1,1)},limit=4))
        self.assertFalse(no_edits)

    def test_small_bruteforce(self):
        # Exact MILP second-solution result must agree with full enumeration.
        counts={}
        grids={}
        for bits in range(512):
            a=np.array([(bits >> i)&1 for i in range(9)],dtype=np.uint8).reshape(3,3)
            key=tuple(tuple(r) for r in derive_clues(a)[0]),tuple(tuple(c) for c in derive_clues(a)[1])
            counts[key]=counts.get(key,0)+1
            grids.setdefault(key,a)
        keys=list(counts)
        unique_keys=[k for k in keys if counts[k]==1][:8]
        multiple_keys=[k for k in keys if counts[k]>1][:8]
        for key in unique_keys + multiple_keys:
            rows=[list(r) for r in key[0]]; cols=[list(c) for c in key[1]]
            status=exact_uniqueness(rows,cols,grids[key],4)['status']
            expected='unique' if counts[key]==1 else 'multiple'
            self.assertEqual(status,expected,f'{key} expected {expected}')

if __name__=='__main__': unittest.main()
