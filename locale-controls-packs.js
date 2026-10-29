/* Native labels for themes, accessibility, mobile controls and puzzle actions. */
(()=>{'use strict';
const ids=['zh-CN','zh-TW','es','pt-BR','fr','de','id','vi','th'];
const rows=[
['네온 다크','霓虹暗色','霓虹深色','Neón oscuro','Neon escuro','Néon sombre','Neon Dunkel','Neon Gelap','Neon tối','นีออนมืด'],
['오로라 네온','极光霓虹','極光霓虹','Neón aurora','Neon aurora','Néon aurore','Aurora-Neon','Neon Aurora','Neon cực quang','ออโรร่านีออน'],
['크림 라벤더','奶油薰衣草','奶油薰衣草','Crema lavanda','Creme lavanda','Crème lavande','Creme-Lavendel','Krim Lavender','Kem oải hương','ครีมลาเวนเดอร์'],
['레트로 그린','复古绿','復古綠','Verde retro','Verde retrô','Vert rétro','Retrogrün','Hijau Retro','Xanh hoài cổ','เขียวย้อนยุค'],
['포레스트 그린','森林绿','森林綠','Verde bosque','Verde floresta','Vert forêt','Waldgrün','Hijau Hutan','Xanh rừng','เขียวป่า'],
['픽셀 시티 아케이드','像素城街机','像素城街機','Arcade Ciudad Pixel','Arcade Cidade Pixel','Arcade Cité Pixel','Pixelstadt-Arcade','Arkade Kota Piksel','Arcade Thành phố Pixel','อาร์เคดเมืองพิกเซล'],
['신비로운 도서관','神秘图书馆','神秘圖書館','Biblioteca misteriosa','Biblioteca misteriosa','Bibliothèque mystérieuse','Mystische Bibliothek','Perpustakaan Misterius','Thư viện huyền bí','ห้องสมุดลึกลับ'],
['정령의 숲','精灵之森','精靈之森','Bosque encantado','Floresta encantada','Forêt enchantée','Verzauberter Wald','Hutan Ajaib','Rừng linh hồn','ป่าวิญญาณ'],
['우주 관제실','太空控制室','太空控制室','Centro de control espacial','Centro de controle espacial','Centre de contrôle spatial','Raumfahrt-Leitstelle','Pusat Kendali Antariksa','Trung tâm điều khiển vũ trụ','ศูนย์ควบคุมอวกาศ'],
['던전 터미널','地下城终端','地下城終端','Terminal de mazmorra','Terminal da masmorra','Terminal du donjon','Dungeon-Terminal','Terminal Penjara Bawah Tanah','Thiết bị đầu cuối hầm ngục','เทอร์มินัลดันเจี้ยน'],
['위로 이동','向上移动','向上移動','Mover arriba','Mover para cima','Monter','Nach oben','Pindah atas','Di chuyển lên','เลื่อนขึ้น'],
['아래로 이동','向下移动','向下移動','Mover abajo','Mover para baixo','Descendre','Nach unten','Pindah bawah','Di chuyển xuống','เลื่อนลง'],
['왼쪽 이동','向左移动','向左移動','Mover izquierda','Mover à esquerda','Aller à gauche','Nach links','Pindah kiri','Di chuyển trái','เลื่อนซ้าย'],
['오른쪽 이동','向右移动','向右移動','Mover derecha','Mover à direita','Aller à droite','Nach rechts','Pindah kanan','Di chuyển phải','เลื่อนขวา'],
['칸 칠하기','填充格子','填滿格子','Rellenar casilla','Preencher célula','Remplir la case','Feld füllen','Isi sel','Tô ô','ระบายช่อง'],
['칸 지우기','擦除格子','清除格子','Borrar casilla','Apagar célula','Effacer la case','Feld löschen','Hapus sel','Xóa ô','ลบช่อง'],
['되돌리기','撤销','復原','Deshacer','Desfazer','Annuler','Rückgängig','Urungkan','Hoàn tác','ย้อนกลับ'],
['다시 실행','重做','重做','Rehacer','Refazer','Rétablir','Wiederholen','Ulangi','Làm lại','ทำซ้ำ'],
['힌트 선택 모드','线索选择模式','提示選取模式','Modo de seleccionar pistas','Modo de seleção de dicas','Mode sélection des indices','Hinweise auswählen','Mode pilih petunjuk','Chế độ chọn gợi ý','โหมดเลือกคำใบ้'],
['칠하기 도구','填充工具','填滿工具','Herramienta de relleno','Ferramenta de preencher','Outil de remplissage','Füllwerkzeug','Alat isi','Công cụ tô','เครื่องมือระบาย'],
['X 도구','X 标记工具','X 標記工具','Herramienta X','Ferramenta X','Outil X','X-Werkzeug','Alat X','Công cụ X','เครื่องมือ X'],
['+ 키','加号键','加號鍵','Tecla +','Tecla +','Touche +','Plus-Taste','Tombol +','Phím +','ปุ่ม +'],
['▦ HUD 편집 · 위치/크기/배경','▦ 编辑HUD · 位置/大小/背景','▦ 編輯HUD · 位置/大小/背景','▦ Editar HUD · posición/tamaño/fondo','▦ Editar HUD · posição/tamanho/fundo','▦ Modifier HUD · position/taille/fond','▦ HUD bearbeiten · Position/Größe/Hintergrund','▦ Edit HUD · posisi/ukuran/latar','▦ Sửa HUD · vị trí/cỡ/nền','▦ แก้ HUD · ตำแหน่ง/ขนาด/พื้นหลัง'],
['모바일 화면의 방향 패드와 동작 버튼을 원하는 스타일로 조정할 수 있어요.','自定义手机方向键及操作按钮的样式。','自訂手機方向鍵與操作按鈕的樣式。','Personaliza la cruceta y los botones de acción del móvil.','Personalize o direcional e os botões de ação no celular.','Personnalisez la croix directionnelle et les boutons d’action du mobile.','Passe Steuerkreuz und Aktionstasten auf Mobilgeräten an.','Sesuaikan D-pad dan tombol aksi di ponsel.','Tùy chỉnh phím hướng và nút thao tác trên điện thoại.','ปรับแต่งปุ่มทิศทางและปุ่มการกระทำบนมือถือได้'],
['이동 방식','移动方式','移動方式','Tipo de movimiento','Tipo de movimento','Type de déplacement','Bewegungsart','Cara bergerak','Cách di chuyển','รูปแบบการเคลื่อนที่'],
['고정형은 십자키, 플로팅형은 손가락이 닿는 위치에 조이스틱이 나타납니다.','固定模式使用十字方向键；浮动模式会在手指触碰处显示摇杆。','固定模式使用十字方向鍵；浮動模式會在手指觸碰處顯示搖桿。','El modo fijo usa una cruceta; el flotante muestra el joystick donde tocas.','O modo fixo usa o direcional; o flutuante mostra o joystick onde você toca.','Le mode fixe utilise une croix ; le mode flottant affiche un joystick à l’endroit touché.','Fest verwendet ein Steuerkreuz; frei zeigt den Joystick an der Berührungsstelle.','Mode tetap memakai D-pad; mode mengambang menampilkan joystick di titik sentuh.','Chế độ cố định dùng phím chữ thập; chế độ nổi hiện cần điều khiển tại nơi chạm.','แบบคงที่ใช้ปุ่มทิศทาง แบบลอยจะแสดงจอยตรงที่นิ้วแตะ'],
['투명도','不透明度','不透明度','Opacidad','Opacidade','Opacité','Deckkraft','Opasitas','Độ mờ đục','ความทึบ'],
['배경과 버튼의 표시 농도','背景与按钮的不透明度','背景與按鈕的不透明度','Opacidad del fondo y los botones','Opacidade do fundo e dos botões','Opacité du fond et des boutons','Deckkraft von Hintergrund und Tasten','Opasitas latar dan tombol','Độ đậm nền và nút','ความทึบพื้นหลังและปุ่ม'],
['크기','大小','大小','Tamaño','Tamanho','Taille','Größe','Ukuran','Kích thước','ขนาด'],
['방향 패드 및 동작 버튼 전체 크기','方向键和操作按钮的整体大小','方向鍵與操作按鈕的整體大小','Tamaño de la cruceta y los botones de acción','Tamanho do direcional e dos botões de ação','Taille de la croix et des boutons d’action','Größe von Steuerkreuz und Aktionstasten','Ukuran D-pad dan tombol aksi','Cỡ phím hướng và nút thao tác','ขนาดปุ่มทิศทางและปุ่มการกระทำ'],
['✥ 버튼 위치 조절','✥ 调整按钮位置','✥ 調整按鈕位置','✥ Ajustar posiciones','✥ Ajustar posições','✥ Placer les boutons','✥ Tastenposition ändern','✥ Atur posisi tombol','✥ Chỉnh vị trí nút','✥ ปรับตำแหน่งปุ่ม'],
['조작 패드 초기화','重置控制键','重設控制鍵','Restablecer controles','Redefinir controles','Réinitialiser les commandes','Steuerung zurücksetzen','Atur ulang kontrol','Đặt lại điều khiển','รีเซ็ตแผงควบคุม'],
['위치 편집 중에는 방향 패드의 ✥ 이동 손잡이와 개별 동작 버튼을 드래그할 수 있습니다. 설정은 이 브라우저에 저장됩니다.','编辑位置时，可拖动方向键的✥手柄和各操作按钮。设置保存在此浏览器。','編輯位置時，可拖曳方向鍵的✥把手與各操作按鈕。設定儲存在此瀏覽器。','En modo de edición, arrastra el tirador ✥ y los botones. Los ajustes se guardan en este navegador.','No modo de edição, arraste a alça ✥ e os botões. As configurações são salvas neste navegador.','En mode édition, faites glisser la poignée ✥ et les boutons. Les réglages sont enregistrés dans ce navigateur.','Im Bearbeitungsmodus den ✥-Griff und die Tasten ziehen. Die Einstellungen bleiben in diesem Browser.','Saat mengedit, seret pegangan ✥ dan tombol. Pengaturan tersimpan di browser ini.','Khi chỉnh vị trí, kéo tay nắm ✥ và từng nút. Cài đặt lưu trong trình duyệt này.','ขณะแก้ตำแหน่ง ให้ลากด้าม ✥ และแต่ละปุ่ม การตั้งค่าบันทึกในเบราว์เซอร์นี้'],
['레이아웃은 유지 · 0 ~ 500 P','布局不变 · 0～500 P','版面維持不變 · 0～500 P','Mismo diseño · 0–500 P','Mesmo layout · 0–500 P','Même disposition · 0–500 P','Gleiches Layout · 0–500 P','Tata letak tetap · 0–500 P','Giữ bố cục · 0–500 P','เค้าโครงเดิม · 0–500 P'],
['배경·메뉴·카드·게임판 전면 재설계 · 2,500 ~ 6,500 P','背景、菜单、卡片及棋盘全部重制 · 2,500～6,500 P','背景、選單、卡片與盤面全面重製 · 2,500～6,500 P','Cambio completo de fondo, menús, tarjetas y tablero · 2.500–6.500 P','Mudança total do fundo, menus, cartões e tabuleiro · 2.500–6.500 P','Refonte du fond, des menus, cartes et grille · 2 500–6 500 P','Komplett neues Design für Hintergrund, Menüs, Karten und Spielfeld · 2.500–6.500 P','Latar, menu, kartu dan papan berubah total · 2.500–6.500 P','Đổi toàn bộ nền, menu, thẻ và bàn chơi · 2.500–6.500 P','เปลี่ยนพื้นหลัง เมนู การ์ด และกระดานทั้งหมด · 2,500–6,500 P'],
['기본 테마는 무료로 계속 사용할 수 있어요.','默认主题始终可以免费使用。','預設主題始終可免費使用。','El tema básico siempre es gratis.','O tema padrão é sempre gratuito.','Le thème par défaut reste toujours gratuit.','Das Standarddesign bleibt kostenlos.','Tema bawaan tetap gratis.','Giao diện mặc định luôn miễn phí.','ธีมเริ่มต้นใช้ฟรีได้เสมอ'],
['맞춤','适应','พอดีหน้าจอ','Ajustar','Ajustar','Adapter','Anpassen','Sesuaikan','Vừa khít','พอดี'],
['가운데 두기','居中','置中','Centrar','Centralizar','Centrer','Zentrieren','Tengahkan','Căn giữa','จัดกึ่งกลาง'],
['화면 맞춤','适应屏幕','符合螢幕','Ajustar a pantalla','Ajustar à tela','Adapter à l’écran','An Bildschirm anpassen','Sesuaikan layar','Vừa màn hình','พอดีจอ'],
['💡 도움 힌트','💡 提示','💡 提示','💡 Pista','💡 Dica','💡 Indice','💡 Tipp','💡 Petunjuk','💡 Gợi ý','💡 คำใบ้'],
['✓ 오답 검사','✓ 检查错误','✓ 檢查錯誤','✓ Comprobar errores','✓ Verificar erros','✓ Vérifier les erreurs','✓ Fehler prüfen','✓ Periksa kesalahan','✓ Kiểm tra lỗi','✓ ตรวจข้อผิดพลาด'],
['퍼즐판 크기 조절','调整棋盘大小','調整盤面大小','Cambiar tamaño del tablero','Ajustar tamanho do tabuleiro','Redimensionner la grille','Spielfeldgröße ändern','Ubah ukuran papan','Điều chỉnh cỡ bàn chơi','ปรับขนาดกระดาน'],
['노노그램 퍼즐','数织谜题','數織謎題','Puzle nonograma','Puzzle nonograma','Grille de nonogramme','Nonogramm-Rätsel','Teka-teki nonogram','Câu đố nonogram','ปริศนาโนโนแกรม'],
['저장된 퍼즐을 이어서 시작했어요.','已继续上次保存的谜题。','已繼續上次儲存的謎題。','Se reanudó el puzle guardado.','O puzzle salvo foi retomado.','La grille enregistrée a été reprise.','Gespeichertes Rätsel fortgesetzt.','Teka-teki tersimpan dilanjutkan.','Đã tiếp tục câu đố đã lưu.','เล่นต่อจากปริศนาที่บันทึกไว้แล้ว'],
['✦ 숲속 퍼즐 시작하기','✦ 开始森林谜题','✦ 開始森林謎題','✦ Entrar en el puzle del bosque','✦ Iniciar puzzle da floresta','✦ Commencer la grille de la forêt','✦ Waldrätsel starten','✦ Mulai teka-teki hutan','✦ Bắt đầu câu đố trong rừng','✦ เริ่มปริศนาในป่า'],
['✧ 나만의 속도로 즐기는 노노그램','✧ 按自己的节奏玩数织','✧ 依自己的步調玩數織','✧ Nonogramas a tu ritmo','✧ Nonogramas no seu ritmo','✧ Nonogrammes à votre rythme','✧ Nonogramme in deinem Tempo','✧ Nonogram sesuai ritmemu','✧ Nonogram theo nhịp của bạn','✧ เล่นโนโนแกรมตามจังหวะของคุณ'],
['✦ 칸을 채우면 숨겨진 그림이 나타나요.','✦ 填充格子即可揭开隐藏的图案。','✦ 填滿格子就能揭開隱藏的圖案。','✦ Rellena casillas para descubrir la imagen oculta.','✦ Preencha células para revelar a imagem escondida.','✦ Remplissez les cases pour révéler l’image cachée.','✦ Fülle Felder, um das versteckte Bild zu enthüllen.','✦ Isi sel untuk menampilkan gambar tersembunyi.','✦ Tô ô để hiện hình ảnh ẩn.','✦ ระบายช่องเพื่อเปิดเผยรูปที่ซ่อนอยู่'],
['터미널 빠른 실행','终端快捷启动','終端快速啟動','Accesos rápidos del terminal','Atalhos do terminal','Raccourcis du terminal','Terminal-Schnellzugriff','Pintasan terminal','Lối tắt thiết bị đầu cuối','ทางลัดเทอร์มินัล'],
['퍼즐 선택:','选择谜题：','選擇謎題：','Elegir puzle:','Escolher puzzle:','Choisir une grille :','Rätsel auswählen:','Pilih teka-teki:','Chọn câu đố:','เลือกปริศนา:']
];
for(const row of rows){
 if(row.length!==ids.length+1)throw Error('Invalid control translation row: '+row[0]);
 ids.forEach((locale,i)=>window.NONO_LOCALE_PACKS[locale][row[0]]=row[i+1]);
}
})();
