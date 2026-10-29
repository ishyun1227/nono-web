/* Language-specific ICU-style parameter templates for NONO dynamic UI strings.
 * Never translates user-generated nicknames or puzzle answer/bitmask data.
 */
(()=>{'use strict';
const ids=['en','ja','zh-CN','zh-TW','es','pt-BR','fr','de','id','vi','th'];
const rows=[
['example','View example: {name}','画像で説明：{name}','查看图示：{name}','查看圖解：{name}','Ver ejemplo: {name}','Ver exemplo: {name}','Voir l’exemple : {name}','Bildbeispiel: {name}','Lihat contoh: {name}','Xem ví dụ: {name}','ดูตัวอย่าง: {name}'],
['preview','Preview: {name}','プレビュー：{name}','预览：{name}','預覽：{name}','Vista previa: {name}','Prévia: {name}','Aperçu : {name}','Vorschau: {name}','Pratinjau: {name}','Xem trước: {name}','ตัวอย่าง: {name}'],
['completed','{a} / {b} completed','{a} / {b} 達成','已完成 {a} / {b}','完成 {a} / {b}','{a} de {b} completadas','{a} de {b} concluídas','{a} sur {b} terminées','{a} / {b} erledigt','{a} dari {b} selesai','Hoàn thành {a} / {b}','สำเร็จ {a} / {b}'],
['day','Day {n}','{n}日目','第{n}天','第{n}天','Día {n}','Dia {n}','Jour {n}','Tag {n}','Hari {n}','Ngày {n}','วันที่ {n}'],
['dayClaim','Day {n} · Claim {p} P','{n}日目 · {p} Pを受け取る','第{n}天 · 签到领取 {p} P','第{n}天 · 簽到領取 {p} P','Día {n} · Recibe {p} P','Dia {n} · Receba {p} P','Jour {n} · Recevoir {p} P','Tag {n} · {p} P abholen','Hari {n} · Klaim {p} P','Ngày {n} · Nhận {p} P','วันที่ {n} · รับ {p} P'],
['todayClaim','Hoy es día {n} · Recibe {p} P','今日は{n}日目 · {p} P獲得','今天第{n}天 · 领取 {p} P','今天第{n}天 · 領取 {p} P','Hoy es el día {n} · Recibe {p} P','Hoje é o dia {n} · Receba {p} P','Aujourd’hui, jour {n} · {p} P à recevoir','Heute Tag {n} · {p} P abholen','Hari ini hari {n} · Klaim {p} P','Hôm nay ngày {n} · Nhận {p} P','วันนี้วันที่ {n} · รับ {p} P'],
['checkin','🎁 Claim daily reward · +{p} P','🎁 出席報酬を受け取る · +{p} P','🎁 领取签到奖励 · +{p} P','🎁 領取簽到獎勵 · +{p} P','🎁 Cobrar recompensa diaria · +{p} P','🎁 Resgatar recompensa diária · +{p} P','🎁 Recevoir le bonus quotidien · +{p} P','🎁 Tagesbonus abholen · +{p} P','🎁 Ambil hadiah harian · +{p} P','🎁 Nhận thưởng điểm danh · +{p} P','🎁 รับรางวัลเช็กอิน · +{p} P'],
['claim','Claim +{p} P','+{p} Pを受け取る','领取 +{p} P','領取 +{p} P','Cobrar +{p} P','Resgatar +{p} P','Recevoir +{p} P','+{p} P abholen','Ambil +{p} P','Nhận +{p} P','รับ +{p} P'],
['claimed','Claimed ✓','受取済み ✓','已领取 ✓','已領取 ✓','Cobrado ✓','Resgatado ✓','Reçu ✓','Abgeholt ✓','Sudah diambil ✓','Đã nhận ✓','รับแล้ว ✓'],
['progress','Progress {n}%','進捗 {n}%','进度 {n}%','進度 {n}%','Progreso {n}%','Progresso {n}%','Progression {n}%','Fortschritt {n}%','Kemajuan {n}%','Tiến độ {n}%','ความคืบหน้า {n}%'],
['needPoints','Not enough points · Need {p} P','ポイント不足 · {p} P必要','积分不足 · 需要 {p} P','點數不足 · 需要 {p} P','Puntos insuficientes · Necesitas {p} P','Pontos insuficientes · Faltam {p} P','Points insuffisants · {p} P requis','Nicht genug Punkte · {p} P nötig','Poin kurang · Perlu {p} P','Không đủ điểm · Cần {p} P','แต้มไม่พอ · ต้องใช้ {p} P'],
['unlock','🪙 Unlock for {p} P','🪙 {p} Pで解放','🪙 使用 {p} P 解锁','🪙 使用 {p} P 解鎖','🪙 Desbloquear por {p} P','🪙 Desbloquear por {p} P','🪙 Débloquer pour {p} P','🪙 Für {p} P freischalten','🪙 Buka dengan {p} P','🪙 Mở khóa bằng {p} P','🪙 ปลดล็อกด้วย {p} P'],
['demo','🪙 {p} demo P','🪙 {p} 体験P','🪙 {p} 体验积分','🪙 {p} 體驗點數','🪙 {p} P de prueba','🪙 {p} P de teste','🪙 {p} P d’essai','🪙 {p} Test-P','🪙 {p} P demo','🪙 {p} P thử','🪙 {p} แต้มทดลอง'],
['empty','No puzzles in progress.','進行中のパズルはありません。','没有未完成的谜题。','沒有未完成的謎題。','No hay puzles pendientes.','Não há puzzles em andamento.','Aucune grille en cours.','Keine offenen Rätsel.','Tidak ada teka-teki tertunda.','Không có câu đố đang chơi.','ไม่มีปริศนาที่ค้างอยู่'],
['profile','Applied immediately · Saved on this device · {device} profile','即時反映 · この端末に保存 · {device}プロフィール','即时应用 · 保存于本设备 · {device} 配置','立即套用 · 儲存在此裝置 · {device} 設定檔','Cambios instantáneos · Guardados en este dispositivo · Perfil {device}','Mudanças imediatas · Salvas neste dispositivo · Perfil {device}','Changements immédiats · Enregistrés sur cet appareil · Profil {device}','Sofort angewandt · Auf diesem Gerät gespeichert · {device}-Profil','Langsung diterapkan · Tersimpan di perangkat ini · Profil {device}','Áp dụng ngay · Lưu trên thiết bị · Hồ sơ {device}','ใช้ทันที · บันทึกบนอุปกรณ์ · โปรไฟล์ {device}'],
['over','Over {n} cells','{n}マス超','超过 {n} 格','超過 {n} 格','Más de {n} casillas','Mais de {n} células','Plus de {n} cases','Über {n} Felder','Lebih dari {n} sel','Hơn {n} ô','เกิน {n} ช่อง'],
['rowcol','Row {a}, column {b}','{a}行 {b}列','第{a}行第{b}列','第{a}行第{b}列','Fila {a}, columna {b}','Linha {a}, coluna {b}','Ligne {a}, colonne {b}','Zeile {a}, Spalte {b}','Baris {a}, kolom {b}','Hàng {a}, cột {b}','แถว {a} คอลัมน์ {b}'],
['rowClue','Row {a} · Column {b}','行 {a} · 列 {b}','行 {a} · 列 {b}','行 {a} · 列 {b}','Fila {a} · Columna {b}','Linha {a} · Coluna {b}','Ligne {a} · Colonne {b}','Zeile {a} · Spalte {b}','Baris {a} · Kolom {b}','Hàng {a} · Cột {b}','แถว {a} · คอลัมน์ {b}'],
['quickTutorial','{size} · Arrows / Space / X','{size} · 矢印キー / Space / X','{size} · 方向键 / Space / X','{size} · 方向鍵 / Space / X','{size} · Flechas / Space / X','{size} · Setas / Space / X','{size} · Flèches / Espace / X','{size} · Pfeile / Leertaste / X','{size} · Tombol panah / Space / X','{size} · Phím mũi tên / Space / X','{size} · ปุ่มลูกศร / Space / X'],
['puzzleNumber','Puzzle {n}, {size}','パズル {n}、{size}','谜题 {n}，{size}','謎題 {n}，{size}','Puzle {n}, {size}','Puzzle {n}, {size}','Grille {n}, {size}','Rätsel {n}, {size}','Teka-teki {n}, {size}','Câu đố {n}, {size}','ปริศนา {n}, {size}'],
['puzzleCatalog','{size} · Puzzle {n}','{size} · パズル {n}','{size} · 谜题 {n}','{size} · 謎題 {n}','{size} · Puzle {n}','{size} · Puzzle {n}','{size} · Grille {n}','{size} · Rätsel {n}','{size} · Teka-teki {n}','{size} · Câu đố {n}','{size} · ปริศนา {n}'],
['sizeTest','{size} · Size test','{size} · サイズテスト','{size} · 尺寸测试','{size} · 尺寸測試','{size} · Prueba de tamaño','{size} · Teste de tamanho','{size} · Test de taille','{size} · Größentest','{size} · Tes ukuran','{size} · Thử kích thước','{size} · ทดสอบขนาด']
];
const maps=Object.fromEntries(ids.map((id,i)=>[id,{}]));
for(const row of rows){
 if(row.length!==ids.length+1)throw Error('Dynamic locale row '+row[0]);
 ids.forEach((id,i)=>maps[id][row[0]]=row[i+1]);
}
const apply=(locale,key,args={})=>{
 const template=maps[locale]?.[key]||maps.en[key];
 return template?.replace(/\{([a-z]+)\}/g,(_,k)=>String(args[k]??''))||null;
};
const make=(source,locale,t)=>{
 let m;
 if((m=/^(.+?) 이미지로 설명보기$/.exec(source)))return apply(locale,'example',{name:t(m[1])});
 if((m=/^(.+?) 미리보기$/.exec(source)))return apply(locale,'preview',{name:t(m[1])});
 if((m=/^(\d+)\s*\/\s*(\d+)\s*달성$/.exec(source)))return apply(locale,'completed',{a:m[1],b:m[2]});
 if((m=/^(\d+)일차(?: ✨)?$/.exec(source)))return apply(locale,'day',{n:m[1]})+(source.includes('✨')?' ✨':'');
 if((m=/^(\d+)일차 · 출석하고 ([\d,]+) P 받기$/.exec(source)))return apply(locale,'dayClaim',{n:m[1],p:m[2]});
 if((m=/^오늘은 (\d+)일차 · 출석하고 ([\d,]+) P 받기$/.exec(source)))return apply(locale,'todayClaim',{n:m[1],p:m[2]});
 if((m=/^🎁 오늘 출석 보상 받기 · \+([\d,]+) P$/.exec(source)))return apply(locale,'checkin',{p:m[1]});
 if((m=/^\+([\d,]+) P 받기$/.exec(source)))return apply(locale,'claim',{p:m[1]});
 if(source==='받음 ✓')return apply(locale,'claimed');
 if((m=/^진행률 (\d+)%$/.exec(source)))return apply(locale,'progress',{n:m[1]});
 if((m=/^포인트 부족 · ([\d,]+) P 필요$/.exec(source)))return apply(locale,'needPoints',{p:m[1]});
 if((m=/^🪙 ([\d,]+) P로 잠금 해제$/.exec(source)))return apply(locale,'unlock',{p:m[1]});
 if((m=/^🪙 ([\d,]+) 체험 P$/.exec(source)))return apply(locale,'demo',{p:m[1]});
 if(/^진행 중 퍼즐이 없어요/.test(source))return apply(locale,'empty');
 if((m=/^변경 즉시 적용 · 장치별 브라우저 저장 · (PC|터치) 프로필$/.exec(source)))
   return apply(locale,'profile',{device:m[1]==='PC'?'PC':locale==='en'?'Touch':t('모바일 조작 패드')});
 if((m=/^(\d+)칸 초과$/.exec(source)))return apply(locale,'over',{n:m[1]});
 if((m=/^(\d+)행 (\d+)열$/.exec(source)))return apply(locale,'rowcol',{a:m[1],b:m[2]});
 if((m=/^행 (.+) · 열 (.+)$/.exec(source)))return apply(locale,'rowClue',{a:m[1],b:m[2]});
 if((m=/^(\d+×\d+) · 방향키 \/ Space \/ X$/.exec(source)))return apply(locale,'quickTutorial',{size:m[1]});
 if((m=/^퍼즐 (\d+), (\d+×\d+)$/.exec(source)))return apply(locale,'puzzleNumber',{n:m[1],size:m[2]});
 if((m=/^(\d+×\d+) · 퍼즐 (\d+)$/.exec(source)))return apply(locale,'puzzleCatalog',{size:m[1],n:m[2]});
 if((m=/^(\d+×\d+) · 크기 테스트$/.exec(source)))return apply(locale,'sizeTest',{size:m[1]});
 if((m=/^(.+?) 진행 중$/.exec(source)))return t(m[1])+' · '+t('진행 중');
 if((m=/^(.+?) 이어하기$/.exec(source)))return t(m[1])+' · '+t('이어하기');
 if((m=/^([\d,]+ P) 현금 충전 준비 중$/.exec(source)))return m[1]+' · '+t('결제 준비 중');
 if((m=/^퍼즐 선택: (.+)$/.exec(source)))return t('퍼즐 선택:')+' '+t(m[1]);
 if((m=/^(\d+) \/ 5$/.exec(source)))return m[1]+' / 5';
 if((m=/^혼자 풀기 (\d+)$/.exec(source)))return t('혼자 풀기')+' '+m[1];
 if((m=/^대결 (\d+)$/.exec(source)))return t('대결')+' '+m[1];
 if((m=/^협동 (\d+)$/.exec(source)))return t('협동')+' '+m[1];
 return null;
};
window.NONO_DYNAMIC_LOCALE=Object.freeze({format:make,templates:maps});
})();