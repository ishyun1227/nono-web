/* Translation pack for the five-tab community and game reward policy. */
(()=>{'use strict';
const ids=['en','ja','zh-CN','zh-TW','es','pt-BR','fr','de','id','vi','th'];
const rows=[
 ['커뮤니티','Community','コミュニティ','社区','社群','Comunidad','Comunidade','Communauté','Community','Komunitas','Cộng đồng','ชุมชน'],
 ['🪙 퍼즐 보상표','🪙 Puzzle rewards','🪙 パズル報酬','🪙 谜题奖励','🪙 謎題獎勵','🪙 Recompensas','🪙 Recompensas','🪙 Récompenses','🪙 Rätselprämien','🪙 Hadiah puzzle','🪙 Thưởng câu đố','🪙 รางวัลปริศนา'],
 ['퍼즐 포인트 보상표 열기','Open puzzle point rewards','パズル報酬表を開く','打开谜题积分表','開啟謎題點數表','Ver tabla de puntos','Abrir tabela de pontos','Voir les récompenses','Punktetabelle öffnen','Lihat tabel poin','Xem bảng điểm thưởng','เปิดตารางคะแนนรางวัล'],
 ['퍼즐 크기','Puzzle size','パズルサイズ','谜题大小','謎題大小','Tamaño','Tamanho','Taille','Rätselgröße','Ukuran','Kích thước','ขนาดปริศนา'],
 ['내 기록','My records','マイ記録','我的记录','我的紀錄','Mis récords','Meus recordes','Mes records','Meine Rekorde','Rekor saya','Kỷ lục của tôi','สถิติของฉัน'],
 ['퍼즐별 랭킹','Puzzle rankings','パズル別ランキング','谜题排行榜','謎題排行榜','Clasificación por puzle','Ranking por puzzle','Classement par grille','Rätselrangliste','Peringkat puzzle','Xếp hạng câu đố','อันดับปริศนา'],
 ['최근 클리어','Recent clears','最近のクリア','最近完成','最近完成','Completados recientes','Conclusões recentes','Grilles terminées','Zuletzt gelöst','Baru diselesaikan','Hoàn thành gần đây','ผ่านด่านล่าสุด'],
 ['기록 경쟁 시작','Start time trial','タイムアタック開始','开始计时挑战','開始計時挑戰','Iniciar contrarreloj','Iniciar desafio cronometrado','Lancer le chrono','Zeitrennen starten','Mulai tantangan waktu','Bắt đầu thử thời gian','เริ่มแข่งจับเวลา'],
 ['크기와 난이도가 높을수록 보상이 늘어나요. 모두 이 브라우저에서만 쓰는 체험 P예요.','Larger, harder puzzles award more points. These are demo points for this browser only.','サイズと難度が高いほど報酬アップ。このブラウザ限定の体験ポイントです。','谜题越大越难，奖励越多。仅限此浏览器的体验积分。','謎題越大越難，獎勵越多。僅限此瀏覽器的體驗點數。','Los puzles más grandes y difíciles dan más puntos. Son puntos de prueba solo de este navegador.','Puzzles maiores e mais difíceis rendem mais pontos. São pontos de teste deste navegador.','Les grilles plus grandes et difficiles rapportent plus. Points démo limités à ce navigateur.','Größere, schwierigere Rätsel bringen mehr. Nur Demo-Punkte in diesem Browser.','Puzzle lebih besar dan sulit memberi lebih banyak poin. Hanya poin demo peramban ini.','Câu đố lớn và khó thưởng nhiều điểm hơn. Đây chỉ là điểm thử trên trình duyệt này.','ปริศนาที่ยากและใหญ่ให้แต้มมากกว่า แต้มทดลองใช้เฉพาะเบราว์เซอร์นี้'],
 ['승리 연속 보너스','Win-streak bonus','連勝ボーナス','连胜奖励','連勝獎勵','Bono por racha','Bônus de vitórias seguidas','Bonus de série de victoires','Siegesserien-Bonus','Bonus menang beruntun','Thưởng thắng liên tiếp','โบนัสชนะต่อเนื่อง'],
 ['위 기본 포인트 지급 · 동일 퍼즐은 하루 첫 완료 1회만 지급','Base points above · Once per puzzle per day','上記基本ポイント · 同じパズルは1日1回','以上基础积分 · 每个谜题每天限一次','以上基本點數 · 每題每天限一次','Puntos base · Una vez por puzle y día','Pontos base · Uma vez por puzzle ao dia','Points de base · Une fois par grille et par jour','Basispunkte · Pro Rätsel einmal täglich','Poin dasar · Sekali per puzzle per hari','Điểm cơ bản · Mỗi câu đố một lần mỗi ngày','แต้มพื้นฐาน · ปริศนาละวันละครั้ง'],
 ['완료: 기본 포인트 / 승리: 기본의 50% 추가 / 패배: 승리 보너스 없음','Finish: base points / Win: +50% / Loss: no win bonus','完走：基本ポイント / 勝利：+50% / 敗北：勝利ボーナスなし','完成：基础积分 / 胜利：额外50% / 失败：无胜利奖励','完成：基本點數 / 勝利：額外50% / 失敗：無勝利獎勵','Terminar: puntos base / Ganar: +50% / Perder: sin bono','Concluir: base / Vencer: +50% / Perder: sem bônus','Terminer : base / Gagner : +50 % / Perdre : aucun bonus','Abschluss: Basis / Sieg: +50 % / Niederlage: kein Bonus','Selesai: poin dasar / Menang: +50% / Kalah: tanpa bonus','Hoàn thành: điểm cơ bản / Thắng: +50% / Thua: không thưởng','จบ: แต้มพื้นฐาน / ชนะ: +50% / แพ้: ไม่มีโบนัส'],
 ['2연승 +20 P · 3연승 +40 P · 4연승 +60 P · 5연승 +80 P · 6연승 이상 +100 P','2 wins +20 P · 3 +40 P · 4 +60 P · 5 +80 P · 6+ +100 P','2連勝 +20 P · 3 +40 P · 4 +60 P · 5 +80 P · 6以上 +100 P','2连胜 +20 P · 3 +40 P · 4 +60 P · 5 +80 P · 6以上 +100 P','2連勝 +20 P · 3 +40 P · 4 +60 P · 5 +80 P · 6以上 +100 P','2 victorias +20 P · 3 +40 P · 4 +60 P · 5 +80 P · 6+ +100 P','2 vitórias +20 P · 3 +40 P · 4 +60 P · 5 +80 P · 6+ +100 P','2 victoires +20 P · 3 +40 P · 4 +60 P · 5 +80 P · 6+ +100 P','2 Siege +20 P · 3 +40 P · 4 +60 P · 5 +80 P · 6+ +100 P','2 menang +20 P · 3 +40 P · 4 +60 P · 5 +80 P · 6+ +100 P','2 thắng +20 P · 3 +40 P · 4 +60 P · 5 +80 P · 6+ +100 P','ชนะ 2 ครั้ง +20 P · 3 +40 P · 4 +60 P · 5 +80 P · 6+ +100 P'],
 ['완료 시 기본 포인트의 80%(5 P 단위 반올림) · 실제로 칸을 채운 참여자만 지급','Completed co-op: 80% of base (rounded to 5 P) · Contributors only','協力完成：基本の80%（5 P単位）・入力した参加者のみ','合作完成：基础的80%（按5 P取整）· 仅实际参与者','合作完成：基本的80%（按5 P取整）· 僅實際參與者','Cooperativo: 80% de base (múltiplos de 5 P) · Solo participantes','Coop: 80% da base (múltiplos de 5 P) · Só participantes','Coop : 80 % de base (arrondi à 5 P) · Participants actifs','Koop: 80 % Basis (auf 5 P gerundet) · Nur aktive Spieler','Koop: 80% poin dasar (kelipatan 5 P) · Hanya kontributor','Hợp tác: 80% điểm cơ bản (làm tròn 5 P) · Chỉ người góp sức','ร่วมมือ: 80% ของแต้มพื้นฐาน (ปัดทีละ 5 P) · เฉพาะผู้มีส่วนร่วม'],
 ['완료 기록, 퍼즐별 랭킹, 나의 플레이 기록을 확인할 수 있어요.','Browse clears, puzzle rankings and your records.','クリア履歴・ランキング・自分の記録を確認できます。','查看完成记录、谜题排名与个人记录。','查看完成紀錄、謎題排名與個人紀錄。','Consulta completados, clasificaciones y tus récords.','Veja conclusões, rankings e seus recordes.','Consultez les grilles terminées, classements et records.','Gelöste Rätsel, Rankings und eigene Rekorde ansehen.','Lihat puzzle selesai, peringkat, dan rekor Anda.','Xem câu đố đã xong, bảng xếp hạng và kỷ lục.','ดูปริศนาที่ผ่านแล้ว อันดับ และสถิติของคุณ'],
 ['이 브라우저에서 저장된 기록만 표시해요.','Only records saved in this browser are shown.','このブラウザに保存した記録のみ表示します。','仅显示保存在此浏览器的记录。','僅顯示儲存在此瀏覽器的紀錄。','Solo se muestran registros guardados en este navegador.','Somente registros salvos neste navegador.','Seules les données de ce navigateur sont affichées.','Nur in diesem Browser gespeicherte Rekorde.','Hanya rekor dari peramban ini.','Chỉ hiện kỷ lục đã lưu trên trình duyệt này.','แสดงเฉพาะสถิติในเบราว์เซอร์นี้'],
 ['아직 저장된 시간 기록이 없어요.','No saved time records yet.','タイム記録はまだありません。','尚无保存的时间记录。','尚無儲存的時間紀錄。','Todavía no hay récords guardados.','Nenhum recorde salvo ainda.','Aucun record enregistré.','Noch keine gespeicherten Zeiten.','Belum ada catatan waktu.','Chưa có thời gian được lưu.','ยังไม่มีสถิติเวลาที่บันทึก'],
 ['현재 선택한 퍼즐의 기록을 조회해요.','Rankings for the selected puzzle.','選択中のパズルのランキング。','当前所选谜题的排行榜。','目前選取謎題的排行榜。','Clasificación del puzle seleccionado.','Ranking do puzzle selecionado.','Classement de la grille choisie.','Rangliste für das gewählte Rätsel.','Peringkat puzzle yang dipilih.','Xếp hạng câu đố đã chọn.','อันดับปริศนาที่เลือก'],
 ['서버 기록을 불러오는 중…','Loading server records…','サーバー記録を読み込み中…','正在加载服务器记录…','正在載入伺服器紀錄…','Cargando registros…','Carregando recordes…','Chargement des records…','Lade Serverrekorde…','Memuat rekor server…','Đang tải kỷ lục…','กำลังโหลดสถิติจากเซิร์ฟเวอร์…'],
 ['온라인 연결 후 서버 랭킹을 표시해요.','Connect online to see server rankings.','オンライン接続後にランキングを表示します。','联网后显示服务器排名。','連線後顯示伺服器排名。','Conéctate para ver la clasificación.','Conecte-se para ver o ranking.','Connectez-vous pour voir le classement.','Online verbinden, um Rankings zu sehen.','Sambungkan untuk melihat peringkat.','Kết nối mạng để xem xếp hạng.','เชื่อมต่อออนไลน์เพื่อดูอันดับ'],
 ['아직 공개된 완료 기록이 없어요.','No public puzzle clears yet.','公開されたクリア記録はまだありません。','暂无公开的完成记录。','尚無公開的完成紀錄。','Aún no hay completados públicos.','Ainda não há conclusões públicas.','Aucune grille terminée publiée.','Noch keine öffentlichen Abschlüsse.','Belum ada penyelesaian publik.','Chưa có hoàn thành công khai.','ยังไม่มีการผ่านปริศนาสาธารณะ'],
 ['기존 시간 기록 모드를 여기서 시작할 수 있어요.','Start the existing time-trial mode here.','ここから従来のタイムアタックに挑戦できます。','可以在这里开始原有计时模式。','可在這裡開始原有計時模式。','Inicia aquí el modo contrarreloj.','Comece aqui o desafio cronometrado.','Lancez le mode chrono ici.','Starte hier den Zeitrennenmodus.','Mulai mode catatan waktu di sini.','Bắt đầu chế độ tính giờ tại đây.','เริ่มโหมดจับเวลาได้ที่นี่'],
 ['리플레이 공개 및 공유 기능은 준비 중이에요.','Replay sharing is not available yet.','リプレイの公開・共有は準備中です。','回放公开与分享功能尚未上线。','重播公開與分享功能尚未上線。','Compartir repeticiones aún no está disponible.','Compartilhar replays ainda não está disponível.','Le partage des replays arrive plus tard.','Replay-Teilen ist noch nicht verfügbar.','Berbagi replay belum tersedia.','Chia sẻ phát lại chưa có.','การแชร์รีเพลย์ยังไม่พร้อม'],
 ['이 조건의 퍼즐은 아직 준비 중이에요.','No puzzle available for this selection yet.','この条件のパズルはまだ準備中です。','该条件下暂无谜题。','此條件下尚無謎題。','Aún no hay puzles para esta selección.','Ainda não há puzzles para esta seleção.','Aucune grille pour cette sélection.','Noch kein Rätsel für diese Auswahl.','Belum ada puzzle untuk pilihan ini.','Chưa có câu đố phù hợp.','ยังไม่มีปริศนาสำหรับตัวเลือกนี้']
];
const packs=window.NONO_RUNTIME_PACKS||(window.NONO_RUNTIME_PACKS={});
for(const id of ids)if(!packs[id])packs[id]={};
for(const row of rows){
 if(row.length!==ids.length+1)throw Error('Community locale row '+row[0]);
 ids.forEach((id,i)=>packs[id][row[0]]=row[i+1]);
}
const templates={
 en:{solo:p=>`Completed +${p} P`,coop:p=>`Co-op clear +${p} P`,race:(a,b)=>`Complete +${a} P · Win +${b} P · Streak bonus`},
 ja:{solo:p=>`完成 +${p} P`,coop:p=>`協力完成 +${p} P`,race:(a,b)=>`完走 +${a} P · 勝利 +${b} P · 連勝追加`},
 'zh-CN':{solo:p=>`完成 +${p} P`,coop:p=>`合作完成 +${p} P`,race:(a,b)=>`完成 +${a} P · 胜利 +${b} P · 连胜奖励`},
 'zh-TW':{solo:p=>`完成 +${p} P`,coop:p=>`合作完成 +${p} P`,race:(a,b)=>`完成 +${a} P · 勝利 +${b} P · 連勝獎勵`},
 es:{solo:p=>`Completar +${p} P`,coop:p=>`Coop +${p} P`,race:(a,b)=>`Completar +${a} P · Victoria +${b} P · Racha`},
 'pt-BR':{solo:p=>`Concluir +${p} P`,coop:p=>`Coop +${p} P`,race:(a,b)=>`Concluir +${a} P · Vitória +${b} P · Sequência`},
 fr:{solo:p=>`Terminé +${p} P`,coop:p=>`Coop +${p} P`,race:(a,b)=>`Terminer +${a} P · Victoire +${b} P · Série`},
 de:{solo:p=>`Abschluss +${p} P`,coop:p=>`Koop +${p} P`,race:(a,b)=>`Abschluss +${a} P · Sieg +${b} P · Serie`},
 id:{solo:p=>`Selesai +${p} P`,coop:p=>`Koop +${p} P`,race:(a,b)=>`Selesai +${a} P · Menang +${b} P · Streak`},
 vi:{solo:p=>`Hoàn thành +${p} P`,coop:p=>`Hợp tác +${p} P`,race:(a,b)=>`Hoàn thành +${a} P · Thắng +${b} P · Chuỗi thắng`},
 th:{solo:p=>`สำเร็จ +${p} P`,coop:p=>`ร่วมมือ +${p} P`,race:(a,b)=>`สำเร็จ +${a} P · ชนะ +${b} P · โบนัสต่อเนื่อง`}
};
const original=window.NONO_DYNAMIC_LOCALE;
if(original){
 window.NONO_DYNAMIC_LOCALE=Object.freeze({
  ...original,
  format:(raw,locale,t)=>{
   const item=templates[locale];
   if(item){
    let match;
    if((match=/^완료 \+([\d,]+) P$/.exec(raw)))return item.solo(match[1]);
    if((match=/^협동 완료 \+([\d,]+) P$/.exec(raw)))return item.coop(match[1]);
    if((match=/^완료 \+([\d,]+) P · 승리 \+([\d,]+) P · 연승 추가$/.exec(raw)))return item.race(match[1],match[2]);
   }
   return original.format(raw,locale,t);
  }
 });
}
})();
