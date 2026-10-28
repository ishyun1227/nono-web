/* NONO language selector: local UI translation, never modifies puzzle rules or server messages.
 * Original Korean copy remains authoritative; missing new-language entries fall back to English when available.
 */
(()=>{'use strict';
const KEY='nono-language-v1';
const SUPPORTED=['ko','en','ja','zh-CN','zh-TW','es','pt-BR','fr','de','id','vi','th'];
const LEXICON=[
 // Main navigation and lobby
 ['⚙ 설정','⚙ Settings','⚙ 設定'],
 ['🛍 상점','🛍 Shop','🛍 ショップ'],
 ['홈','Home','ホーム'],['상점','Shop','ショップ'],['설정','Settings','設定'],
 ['플레이 방식','Game modes','プレイモード'],['하나만 선택하세요','Select one','ひとつ選んでください'],
 ['혼자 풀기','Solo','ひとりで'],['나만의 속도로','At your own pace','自分のペースで'],
 ['실시간 대결','Live race','リアルタイム対戦'],['먼저 완성하면 승리','Finish first to win','先に完成した人が勝利'],
 ['협동 플레이','Co-op','協力プレイ'],['한 판을 함께 완성','Solve together','みんなで完成'],
 ['기록 경쟁','Time trial','タイムアタック'],['최단 시간 도전','Best time challenge','最速タイムに挑戦'],
 ['혼자 연습','Solo practice','ひとり練習'],['퍼즐을 골라 바로 시작해 보세요.','Pick a puzzle to begin.','パズルを選んで始めましょう。'],
 ['퍼즐 선택','Puzzle selection','パズル選択'],['닉네임','Nickname','ニックネーム'],['플레이어','Player','プレイヤー'],
 ['게임 시작','Start game','ゲーム開始'],['게임 시작 →','Start game →','ゲーム開始 →'],
 ['퍼즐 시작 →','Start puzzle →','パズル開始 →'],['기록 도전 →','Start time trial →','タイムアタック開始 →'],
 ['방 만들기','Create room','ルーム作成'],['참가','Join','参加'],['초대 코드 참가','Join by code','コードで参加'],
 ['초대 코드 6자리','6-character invite code','6文字の招待コード'],
 ['⚡ 빠른 매칭','⚡ Quick match','⚡ クイックマッチ'],['⚡ 빠른 대결','⚡ Quick race','⚡ クイック対戦'],['⚡ 빠른 협동','⚡ Quick co-op','⚡ クイック協力'],
 ['공개 방 목록','Public rooms','公開ルーム'],['● 실시간 갱신','● Live updates','● リアルタイム更新'],
 ['온라인 로비에 연결 중…','Connecting to online lobby…','オンラインロビーに接続中…'],
 ['온라인 연결 후 공개 방이 표시됩니다.','Connect online to view public rooms.','オンライン接続すると公開ルームが表示されます。'],
 ['내가 만드는 방을 공개하기','Make my room public','作成するルームを公開'],
 ['＋ 방 만들기','＋ Create room','＋ ルーム作成'],
 ['이어하기','Resume','つづきから'],['이어서 풀기','Continue puzzles','続きからプレイ'],
 ['혼자 풀기 · 대결 · 협동의 진행 중 퍼즐','Unfinished solo, race & co-op puzzles','ひとり・対戦・協力の未完成パズル'],
 ['혼자 풀기 0','Solo 0','ひとり 0'],['대결 0','Race 0','対戦 0'],['협동 0','Co-op 0','協力 0'],
 ['퍼즐','Puzzle','パズル'],['퍼즐 크기','Puzzle size','パズルのサイズ'],['난이도','Difficulty','難易度'],
 ['작음','Small','小'],['중간','Medium','中'],['큼','Large','大'],['거대','Giant','特大'],
 ['쉬움','Easy','かんたん'],['보통','Normal','ふつう'],['어려움','Hard','むずかしい'],['미지정','Unspecified','未設定'],
 ['이 조건에는 선택 가능한 퍼즐이 없어요.','No puzzles match these filters.','この条件のパズルはありません。'],
 ['선택한 퍼즐','Selected puzzle','選択中のパズル'],
 ['진행률','Progress','進捗'],['가로·세로 힌트를 보고 완성하세요','Use row and column clues to finish','行と列のヒントから完成させましょう'],
 ['퍼즐을 완성해 보세요','Solve the puzzle','パズルを完成させよう'],
 ['✓ 퍼즐 완료! 축하해요!','✓ Puzzle complete!','✓ パズル完成！'],
 ['취소','Undo','戻す'],['다시','Redo','やり直し'],['칠하기','Fill','塗る'],
 ['X 표시','Mark X','× を付ける'],['지우기','Erase','消す'],
 ['← 돌아가기','← Back','← 戻る'],['초대 링크 복사','Copy invite link','招待リンクをコピー'],
 ['처음부터 ↻','Restart ↻','最初から ↻'],['게임 방법 및 단축키','How to play & shortcuts','遊び方とショートカット'],
 ['각 행과 열의 숫자만큼 연속된 칸을 칠하세요. 숫자가 여러 개라면 사이에 최소 한 칸이 비어 있어야 합니다.',
 'Fill consecutive cells to match the row and column clues. Separate number groups with at least one empty cell.',
 '各行と列の数字に合わせて連続するマスを塗ります。数字が複数ある場合は間に1マス以上空けます。'],
 ['방향키 이동 · Space 칠하기 · X 빈칸 표시 · Backspace 지우기 · Ctrl+Z 실행 취소 · Ctrl+Y 다시 실행',
 'Arrows move · Space fill · X mark empty · Backspace erase · Ctrl+Z undo · Ctrl+Y redo',
 '矢印キーで移動 · Space 塗る · X 空白マーク · Backspace 消す · Ctrl+Z 戻す · Ctrl+Y やり直し'],
 ['플레이 정보','Play status','プレイ情報'],['실시간 순위','Live rankings','リアルタイム順位'],
 ['참여 중인 친구','Players','参加プレイヤー'],['최고 기록','Best records','ベスト記録'],
 ['나의 플레이','My play','自分のプレイ'],['초대하기','Invite','招待'],['방 코드','Room code','ルームコード'],
 ['대결 대기실','Race waiting room','対戦待機室'],
 ['친구가 입장하면 시작할 수 있어요.','Start when your friends join.','友だちが入室したら開始できます。'],
 ['대결 시작','Start race','対戦開始'],['2~4명이 참가할 수 있습니다.','2–4 players can join.','2〜4人が参加できます。'],
 ['가볍게 시작.','Start playing.','気軽に遊ぼう。'],
 ['퍼즐을 고르고 원하는 방식으로 즐겨봐요.','Choose a puzzle and play your way.','パズルを選んで好きな遊び方で楽しもう。'],
 ['방향키','Arrow keys','矢印キー'],['이동','Move','移動'],['빈칸','Empty','空欄'],
 // Settings, settings categories, selector and common advanced fields
 ['⚙ 노노그램 설정','⚙ Nonogram settings','⚙ ノノグラム設定'],
 ['닫기','Close','閉じる'],['현재 장치 설정 초기화','Reset device settings','この端末の設定をリセット'],
 ['※ (시험/보류) 옵션은 사용하면서 평가할 기능입니다.','※ Experimental settings may change.','※ 試験的な設定は変更される場合があります。'],
 ['조작','Controls','操作'],['편의성·힌트','Convenience & hints','便利機能・ヒント'],
 ['보드·화면','Board & display','盤面・表示'],['사운드·피드백','Sound & feedback','サウンド・反応'],
 ['멀티플레이','Multiplayer','マルチプレイ'],['모바일 조작 패드','Mobile controls','モバイル操作パッド'],
 ['컨트롤러','Controller','コントローラー'],['기본','Default','標準'],
 ['셀 이동키','Cell movement keys','マス移動キー'],['빠른 셀 이동','Fast cell movement','高速移動'],
 ['셀 반복 속도','Movement repeat speed','移動の連続速度'],['연속 이동 시작 대기','Repeat delay','連続移動までの待ち時間'],
 ['끝에서 반대편 이동','Wrap at edge','端から反対側へ移動'],
 ['조작 도움말','Control tips','操作ヘルプ'],
 ['현재 행·열 강조','Highlight row & column','行と列を強調'],
 ['강조 색상','Highlight color','強調色'],['HUD 크기','HUD size','HUDサイズ'],
 ['HUD 배경','HUD background','HUD背景'],
 ['완료된 행·열 표시','Highlight solved lines','解決した行・列を強調'],
 ['현재 행·열 숫자 HUD','Row/column clues HUD','行・列ヒントHUD'],
 ['드래그 칸 수 HUD','Dragged cells HUD','ドラッグマス数HUD'],
 ['Undo / Redo 버튼','Undo / redo buttons','元に戻す・やり直しボタン'],
 ['진행도 표시 형식','Progress display','進捗表示'],
 ['도움 힌트: 풀 수 있는 줄','Hint: solvable line','ヒント：解ける行・列'],
 ['도움 힌트: 풀이 설명','Hint: explanation','ヒント：解き方の説明'],
 ['도움 힌트: 확실한 한 칸','Hint: guaranteed cell','ヒント：確定する1マス'],
 ['일반 격자선 두께','Grid line width','グリッド線の太さ'],
 ['굵은 구분선 강조','Major grid line strength','太い区切り線の強さ'],
 ['굵은 구분선 간격','Major grid interval','太い区切り線の間隔'],
 ['힌트 숫자 양쪽 표시','Clues on both sides','両側にヒントを表示'],
 ['진행 시간 표시','Show elapsed time','経過時間を表示'],
 ['줄 번호 표시','Show row/column numbers','行・列番号を表示'],
 ['상시 미니맵','Always show minimap','ミニマップを常時表示'],
 ['채우기·X 입력음','Fill & X sounds','塗り・× の音'],
 ['입력 소리 테마','Input sound style','入力音テーマ'],
 ['퍼즐 완료음','Puzzle completion sound','完成時の音'],
 ['UI 클릭 소리','UI click sound','UIクリック音'],
 ['전체 효과음 음량','Master volume','全体音量'],
 ['입력 효과음 음량','Input volume','入力音量'],
 ['셀 입력 애니메이션 테마','Cell animation style','マス入力アニメーション'],
 ['다른 플레이어 이름 (온라인 연동 예정)','Other player names (planned)','他のプレイヤー名（予定）'],
 ['설정 분류','Settings categories','設定カテゴリ'],['설명','Help','説明'],
 ['이미지로 설명보기','View example image','画像で説明'],['저장','Save','保存'],
 // Daily missions / attendance
 ['오늘의 미션','Daily missions','今日のミッション'],['출석 보상','Daily check-in','ログインボーナス'],
 ['퍼즐 1회 완료하기','Complete 1 puzzle','パズルを1回完成'],
 ['대결 1회 참여하기','Join 1 race','対戦に1回参加'],['협동 1회 참여하기','Join 1 co-op','協力プレイに1回参加'],
 ['정답을 완성하면 달성','Finish a puzzle to complete','パズルを完成すると達成'],
 ['진행 중인 대결에서 칸 입력','Make a move during a race','対戦中にマスを入力'],
 ['협동 퍼즐에 칸 입력','Make a move in co-op','協力プレイでマスを入力'],
 ['미션 달성!','Mission complete!','ミッション達成！'],
 ['매일 자정(한국 시간)에 새로운 미션이 시작돼요.','Missions reset at midnight (Korea time).','ミッションは韓国時間の午前0時に更新されます。'],
 ['오늘도 출석하고 보상을 받아보세요.','Check in today for a reward.','今日もログインして報酬を受け取りましょう。'],
 ['오늘 출석 완료! 내일도 들러서 연속 출석을 이어가세요.','Checked in today! Come back tomorrow.','今日の出席完了！明日も来て連続記録を伸ばそう。'],
 ['✓ 오늘 출석 완료','✓ Checked in today','✓ 今日の出席完了'],
 ['포인트는 이 브라우저의 테마 상점 체험에 사용할 수 있어요. 현금 충전·기기 간 동기화는 아직 지원되지 않아요.',
 'You can spend these browser-only demo points on themes. Cash top-ups and device sync are not available.',
 'このブラウザ限定の体験ポイントでテーマを交換できます。現金チャージと端末間同期は未対応です。'],
 ['이 기기 체험 포인트','Demo points on this device','この端末の体験ポイント'],
 ['체험 P','demo P','体験P'],['진행 중','In progress','進行中'],
 // Store and cash safety
 ['🛍 NONO 상점','🛍 NONO Shop','🛍 NONOショップ'],
 ['🎨 테마','🎨 Themes','🎨 テーマ'],['🪙 포인트 충전','🪙 Top up points','🪙 ポイントチャージ'],
 ['👑 광고 제거','👑 Ad-free','👑 広告削除'],
 ['테마 구매 · 포인트 충전 · 광고 제거 프리미엄','Themes · Points · Ad-free premium','テーマ · ポイント · 広告なしプレミアム'],
 ['보상 포인트 구매는 현재 브라우저 체험용이며, 현금 결제는 서버 연동 전입니다.',
 'Reward points are currently browser-only; cash payments are not connected.',
 '報酬ポイントはこのブラウザ限定です。現金決済はまだ未対応です。'],
 ['🎨 색상 테마','🎨 Color themes','🎨 カラーテーマ'],
 ['✨ 프리미엄 테마','✨ Premium themes','✨ プレミアムテーマ'],
 ['기본 무료','Free default','標準無料'],['사용 중','In use','使用中'],
 ['보유 중','Owned','所持済み'],['보유 테마 적용','Apply owned theme','所持テーマを適用'],
 ['선택한 테마 사용 중','Selected theme in use','選択中のテーマを使用中'],
 ['무료 체험 적용','Apply free preview','無料プレビューを適用'],
 ['기본 테마 적용','Apply default theme','標準テーマを適用'],
 ['결제 준비 중','Checkout coming soon','決済準備中'],
 ['포인트 충전','Top up points','ポイントチャージ'],
 ['현금으로 포인트를 충전할 상품이에요. 아직 결제 사업자·서버 승인 연동이 없어 실제 결제는 받지 않습니다.',
 'These are proposed cash top-up packages. Payment provider and server approval are not connected; no payment is charged.',
 '現金でポイントを購入するための予定商品です。決済事業者・サーバー承認が未接続のため、お支払いは発生しません。'],
 ['소량 충전 패키지','Small top-up package','少額チャージ'],
 ['테마 구매용 패키지','For theme purchases','テーマ購入向け'],
 ['월드 테마 구매용 패키지','For world themes','ワールドテーマ向け'],
 ['원화 판매가 미정','KRW price TBD','ウォン価格未定'],
 ['결제 승인 이후에만 서버 포인트가 적립되어야 합니다. 브라우저 체험 P는 현금 충전·환불·기기 간 이동 대상이 아닙니다.',
 'Server points are credited only after verified payment. Browser demo points cannot be topped up, refunded or transferred.',
 'サーバーポイントは決済承認後に付与します。ブラウザ体験ポイントはチャージ・返金・端末移行できません。'],
 ['광고 제거 프리미엄','Ad-free premium','広告なしプレミアム'],
 ['향후 사이트에 광고가 도입되면 광고 없는 플레이를 제공하는 상품으로 계획 중입니다.',
 'Planned ad-free play if ads are introduced later.',
 '今後広告が導入された場合に広告なしで遊べる予定の商品です。'],
 ['판매 가격 · 이용 기간 · 결제·환불 정책 미정','Price · Term · Refund policy TBD','価格・期間・返金規約は未定'],
 ['프리미엄 구매 준비 중','Premium not for sale yet','プレミアム販売準備中'],
 ['현재 광고 제거 기능이나 결제 승인이 연동되지 않았습니다. 구매 완료/광고 차단 상태로 표시하지 않습니다.',
 'Ad removal and payments are not connected. No purchase or ad-block status is granted.',
 '広告削除・決済が未接続のため、購入済みや広告非表示としては扱いません。'],
 ['출석·미션 보상으로 얻은 포인트 · 이 브라우저 전용',
 'Points from missions and check-ins · This browser only',
 'ミッション・出席報酬のポイント · このブラウザ限定'],
 ['포인트 부족','Not enough points','ポイント不足'],['테마 카드에서 미리보기 후 포인트로 잠금 해제할 수 있어요. 체험으로 얻은 P만 사용됩니다.',
 'Preview a theme, then unlock it with earned demo points.',
 'テーマをプレビューして、獲得した体験ポイントで解放できます。'],
 ['이 테마는 이 브라우저에서 사용할 수 있어요. 계정 간 소유권 동기화는 아직 지원하지 않아요.',
 'This theme is available in this browser; ownership is not synced across accounts.',
 'このテーマはこのブラウザで使用できます。アカウント間の所有権同期は未対応です。'],
 ['포인트를 확인할 수 없어요.','Unable to read points.','ポイントを確認できません。'],
 ['테마','Theme','テーマ'],
 // Existing theme names/descriptions
 ['네온 다크','Neon Dark','ネオンダーク'],['오로라 네온','Aurora Neon','オーロラネオン'],
 ['크림 라벤더','Cream Lavender','クリームラベンダー'],
 ['레트로 그린','Retro Green','レトログリーン'],['포레스트 그린','Forest Green','フォレストグリーン'],
 ['픽셀 시티 아케이드','Pixel City Arcade','ピクセルシティ・アーケード'],
 ['신비로운 도서관','Mystic Library','神秘の図書館'],['정령의 숲','Enchanted Forest','精霊の森'],
 ['우주 관제실','Space Control Room','宇宙管制室'],['던전 터미널','Dungeon Terminal','ダンジョンターミナル']
];
const map={en:new Map(),ja:new Map()};
for(const [ko,en,ja] of LEXICON){map.en.set(ko,en);map.ja.set(ko,ja);}
for(const [source,translation] of Object.entries(window.NONO_EN_EXTRA||{}))map.en.set(source,translation);

const japaneseAuditFixes=[
 ['아직 진행 중인 퍼즐이 없어요. 혼자 풀기, 대결, 협동에서 퍼즐을 시작해 보세요.','進行中のパズルはありません。ひとり・対戦・協力モードで新しく始めましょう。'],
 ['NONO 홈','NONO ホーム'],['플레이 방식 선택','プレイモードを選択'],['닉네임 변경','ニックネームを変更'],
 ['오늘의 미션과 출석 보상','今日のミッションとログインボーナス'],
 ['노노그램 설정','ノノグラム設定'],['프로필','プロフィール'],
 ['위로 이동','上へ移動'],['아래로 이동','下へ移動'],['왼쪽 이동','左へ移動'],['오른쪽 이동','右へ移動'],
 ['칸 칠하기','マスを塗る'],['칸 지우기','マスを消す'],['되돌리기','元に戻す'],['다시 실행','やり直し'],
 ['힌트 선택 모드','ヒント選択モード'],['전체보기','全体表示'],
 ['칠하기 도구','塗りつぶしツール'],['X 도구','Xマークツール'],['+ 키','+ キー'],
 ['도움 힌트 사용음','ヒント使用音'],['이미지로 설명보기','画像で説明を見る'],
 ['▦ HUD 편집 · 위치/크기/배경','▦ HUD編集 · 位置/サイズ/背景'],
 ['모바일 화면의 방향 패드와 동작 버튼을 원하는 스타일로 조정할 수 있어요.','モバイルの方向パッドとアクションボタンを好みに合わせて調整できます。'],
 ['이동 방식','移動方式'],
 ['고정형은 십자키, 플로팅형은 손가락이 닿는 위치에 조이스틱이 나타납니다.','固定式は十字キー、フローティング式はタッチ位置にジョイスティックが表示されます。'],
 ['투명도','透明度'],['배경과 버튼의 표시 농도','パッドとボタンの透明度'],
 ['크기','サイズ'],['방향 패드 및 동작 버튼 전체 크기','方向パッドとアクションボタンの全体サイズ'],
 ['✥ 버튼 위치 조절','✥ ボタン位置の調整'],['조작 패드 초기화','操作パッドを初期化'],
 ['위치 편집 중에는 방향 패드의 ✥ 이동 손잡이와 개별 동작 버튼을 드래그할 수 있습니다. 설정은 이 브라우저에 저장됩니다.','位置編集時は✥ハンドルと各ボタンをドラッグして配置できます。設定はこのブラウザに保存されます。'],
 ['레이아웃은 유지 · 0 ~ 500 P','レイアウト維持 · 0～500 P'],
 ['배경·메뉴·카드·게임판 전면 재설계 · 2,500 ~ 6,500 P','背景・メニュー・カード・盤面を全面変更 · 2,500～6,500 P'],
 ['기본 테마는 무료로 계속 사용할 수 있어요.','標準テーマはいつでも無料で使えます。'],
 ['진행 중','進行中'],['미리보기','プレビュー'],['현금 충전 준비 중','チャージ準備中']
];

japaneseAuditFixes.push(
 ['맞춤','画面に合わせる'],['가운데 두기','中央に配置'],['화면 맞춤','画面にフィット'],
 ['💡 도움 힌트','💡 ヒント'],['✓ 오답 검사','✓ ミスを確認'],
 ['퍼즐 플레이','パズルプレイ'],['노노그램 퍼즐판','ノノグラム盤面'],
 ['퍼즐판 크기 조절','盤面サイズ調整'],['노노그램 퍼즐','ノノグラムパズル'],
 ['행','行'],['열','列'],
 ['저장된 퍼즐을 이어서 시작했어요.','保存したパズルを再開しました。'],
 ['✦ 숲속 퍼즐 시작하기','✦ 森のパズルを始める'],
 ['✧ 나만의 속도로 즐기는 노노그램','✧ 自分のペースで楽しむノノグラム'],
 ['✦ 칸을 채우면 숨겨진 그림이 나타나요.','✦ マスを塗ると隠された絵が現れます。'],
 ['오프라인 체험','オフライン体験'],['터미널 빠른 실행','ターミナルのショートカット'],
 ['크기 테스트','サイズテスト'],['퍼즐 선택:','パズル選択：']
);
for(const [source,translation] of japaneseAuditFixes)map.ja.set(source,translation);

for(const locale of SUPPORTED.filter(l=>!['ko','en','ja'].includes(l))){map[locale]=new Map(Object.entries(window.NONO_LOCALE_PACKS?.[locale]||{}));}
const patterns=[
 [/^(\d+)\s*\/\s*(\d+)\s*달성$/,(m,a,b,l)=>l==='en'?a+' / '+b+' completed':a+' / '+b+' 達成'],
 [/^(\d+)일차(?: ✨)?$/,(m,n,l)=>l==='en'?'Day '+n:'第'+n+'日'],
 [/^(\d+)일차 · 출석하고 ([\d,]+) P 받기$/,(m,n,p,l)=>l==='en'?'Day '+n+' · Check in for '+p+' P':'第'+n+'日 · 出席で'+p+' P'],
 [/^오늘은 (\d+)일차 · 출석하고 ([\d,]+) P 받기$/,(m,n,p,l)=>l==='en'?'Today is day '+n+' · Claim '+p+' P':'今日は第'+n+'日 · '+p+' Pを受け取ろう'],
 [/^🎁 오늘 출석 보상 받기 · \+([\d,]+) P$/,(m,p,l)=>l==='en'?'🎁 Claim check-in · +'+p+' P':'🎁 出席報酬を受け取る · +'+p+' P'],
 [/^\+([\d,]+) P 받기$/,(m,p,l)=>l==='en'?'Claim +'+p+' P':'+ '+p+' P 受け取る'],
 [/^\+([\d,]+) P$/,(m,p)=>'+'+p+' P'],
 [/^받음 ✓$/,(m,l)=>l==='en'?'Claimed ✓':'受取済み ✓'],
 [/^진행률 (\d+)%$/,(m,n,l)=>l==='en'?'Progress '+n+'%':'進捗 '+n+'%'],
 [/^혼자 풀기 (\d+)$/,(m,n,l)=>l==='en'?'Solo '+n:'ひとり '+n],
 [/^대결 (\d+)$/,(m,n,l)=>l==='en'?'Race '+n:'対戦 '+n],
 [/^협동 (\d+)$/,(m,n,l)=>l==='en'?'Co-op '+n:'協力 '+n],
 [/^포인트 부족 · ([\d,]+) P 필요$/,(m,p,l)=>l==='en'?'Need '+p+' P · Not enough points':p+' P必要 · ポイント不足'],
 [/^🪙 ([\d,]+) P로 잠금 해제$/,(m,p,l)=>l==='en'?'🪙 Unlock for '+p+' P':'🪙 '+p+' Pで解放'],
 [/^🪙 ([\d,]+) 체험 P$/,(m,p,l)=>l==='en'?'🪙 '+p+' demo P':'🪙 '+p+' 体験P'],
 [/^진행 중 퍼즐이 없어요.*$/,(m,l)=>l==='en'?'No puzzles in progress.':'進行中のパズルはありません。'],
 [/^(\d+) \/ 5$/,(m,n)=>n+' / 5']
];
// Dynamic UI strings are composed by game/setting modules. Translate their pieces
// instead of relying on Korean interpolation matching a static dictionary entry.
function translateDynamic(original,locale){
 let m;
 const t=value=>translate(value,locale);
 if((m=/^(.+?) 이미지로 설명보기$/.exec(original)))
   return (locale==='ja'?'画像で説明：':locale.startsWith('zh')?'查看示例：':'View example: ')+t(m[1]);
 if((m=/^(.+?) 미리보기$/.exec(original)))
   return (locale==='ja'?'プレビュー：':locale.startsWith('zh')?'预览：':'Preview: ')+t(m[1]);
 if((m=/^(.+?) 진행 중$/.exec(original)))
   return t(m[1])+' · '+t('진행 중');
 if((m=/^(.+?) 이어하기$/.exec(original)))
   return t(m[1])+' · '+t('이어하기');
 if((m=/^퍼즐 (\d+), (\d+×\d+)$/.exec(original)))
   return t('퍼즐')+' '+m[1]+', '+m[2];
 if((m=/^([\d,]+ P) 현금 충전 준비 중$/.exec(original)))
   return m[1]+' · '+t('결제 준비 중');
 if((m=/^변경 즉시 적용 · 장치별 브라우저 저장 · (PC|터치) 프로필$/.exec(original)))
   return (locale==='ja'?'変更を即時適用 · この端末に保存 · ':locale.startsWith('zh')?'即时应用 · 保存于本设备 · ':'Applied immediately · Saved on this device · ')+
     (m[1]==='PC'?'PC':locale==='ja'?'タッチ':locale.startsWith('zh')?'触屏':'Touch')+' '+t('프로필');
 if((m=/^(\d+)칸 초과$/.exec(original)))
   return (locale==='ja'?m[1]+'マス超':locale.startsWith('zh')?'超过'+m[1]+'格':'Over '+m[1]+' cells');
 return null;
}
const attrNames=['aria-label','title','placeholder'];
const originals=new WeakMap(),attrOriginals=new WeakMap();
function languageChoice(){try{const v=localStorage.getItem(KEY);return v==='auto'||SUPPORTED.includes(v)?v:'ko';}catch{return 'ko';}}
let choice=languageChoice();
function effective(v=choice){
 if(v!=='auto')return SUPPORTED.includes(v)?v:'ko';
 const normalize=s=>{
  const code=String(s||'').toLowerCase();
  if(code.startsWith('zh'))return /(^zh-(tw|hk|mo)|-hant)/.test(code)?'zh-TW':'zh-CN';
  if(code.startsWith('pt'))return 'pt-BR';
  return code.split('-')[0];
 };
 const detected=(navigator.languages?.length?navigator.languages:[navigator.language||'ko']).map(normalize).find(v=>SUPPORTED.includes(v));
 return detected||'ko';
}
let active=effective();
function translate(original,locale){
 if(locale==='ko')return original;
 if(map[locale]?.has(original))return map[locale].get(original);
 const dynamic=translateDynamic(original,locale);if(dynamic!==null)return dynamic;
 // Dynamic count/reward texts use English if the selected locale lacks a grammar template.
 for(const [re,fn] of patterns){const match=original.match(re);if(match)return fn(...match,locale==='ja'?'ja':'en');}
 // English text is a deliberate, explicit fallback, not an accidental Korean screen.
 return map.en.get(original)||original;
}
function convertText(node){
 if(!node||node.nodeType!==Node.TEXT_NODE)return;
 const parent=node.parentElement;
 if(parent?.closest('script,style,textarea,pre,code,kbd,option[data-locale-option],#profile-name,.player-pill,.nono-theme-pixels'))return;
 let rec=originals.get(node);
 if(!rec||node.nodeValue!==rec.translated)rec={raw:node.nodeValue,translated:node.nodeValue};
 const trimmed=rec.raw.trim(),prefix=rec.raw.slice(0,rec.raw.indexOf(trimmed)),suffix=rec.raw.slice(rec.raw.indexOf(trimmed)+trimmed.length);
 const output=trimmed?prefix+translate(trimmed,active)+suffix:rec.raw;
 rec.translated=output;originals.set(node,rec);
 if(node.nodeValue!==output)node.nodeValue=output;
}
function convertAttrs(node){
 if(node.nodeType!==1)return;
 let bag=attrOriginals.get(node)||{};
 for(const name of attrNames){
  if(!node.hasAttribute(name))continue;
  const current=node.getAttribute(name),rec=bag[name];
  const raw=!rec||current!==rec.output?current:rec.raw;
  const output=translate(raw,active);
  bag[name]={raw,output};
  if(current!==output)node.setAttribute(name,output);
 }
 attrOriginals.set(node,bag);
}
function localizeTree(node){
 if(!node)return;
 if(node.nodeType===Node.TEXT_NODE){convertText(node);return;}
 if(node.nodeType!==Node.ELEMENT_NODE)return;
 convertAttrs(node);
 if(node.closest('script,style,textarea,pre,code'))return;
 const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
 let part;
 while((part=walker.nextNode()))convertText(part);
 const descendants=node.querySelectorAll('[aria-label],[title],[placeholder]');
 for(const el of descendants)convertAttrs(el);
}
let pending=false;
const observed=new Set();
function queue(node){
 if(node)observed.add(node);
 if(pending)return;
 pending=true;
 queueMicrotask(()=>{
  pending=false;
  if(!observed.size)return;
  const items=Array.from(observed);observed.clear();
  for(const node of items)localizeTree(node.nodeType===Node.TEXT_NODE?node:node);
 });
}
function renderSelector(){
 const modal=document.querySelector('#nono-settings-overlay');
 if(!modal)return;
 const head=modal.querySelector('.nono-settings-head');
 if(!head)return;
 let label=head.querySelector('#nono-language-control');
 if(!label){
  label=document.createElement('label');label.id='nono-language-control';label.className='nono-language-control';
  const caption=document.createElement('span');caption.textContent='🌐 Language';
  const select=document.createElement('select');select.id='nono-language-select';select.setAttribute('aria-label','Language selection');
  for(const [value,name] of [['auto','Auto · Browser'],...(window.NONO_LOCALE_OPTIONS||[['ko','한국어'],['en','English'],['ja','日本語']])]){
   const option=document.createElement('option');option.value=value;option.textContent=name;option.dataset.localeOption='1';select.append(option);
  }
  select.addEventListener('change',()=>setLanguage(select.value));
  label.append(caption,select);
  head.insertBefore(label,head.lastElementChild);
 }
 const input=label.querySelector('select');if(input&&input.value!==choice)input.value=choice;
}
function setLanguage(next){
 if(next!=='auto'&&!SUPPORTED.includes(next))return false;
 choice=next;active=effective();
 try{localStorage.setItem(KEY,next);}catch(_){}
 document.documentElement.lang=active;document.documentElement.dataset.nonoLang=active;
 document.title=active==='ko'?'NONO — 노노그램':active==='ja'?'NONO — ノノグラム':'NONO — Nonogram';
 renderSelector();queue(document.body);
 window.dispatchEvent(new CustomEvent('nono:languagechange',{detail:{choice,locale:active}}));
 return true;
}
const stylesheet=document.createElement('style');
stylesheet.textContent='.nono-language-control{display:flex;align-items:center;gap:6px;font-size:12px;color:#d9e4ff;white-space:nowrap;margin-left:auto}.nono-language-control select{background:#1a2946;border:1px solid #607299;color:#fff;border-radius:8px;padding:8px 9px;min-width:124px;max-width:160px;font:inherit}.nono-language-control select:focus-visible{outline:2px solid #83d5fd;outline-offset:2px}@media(max-width:650px){.nono-settings-head{flex-wrap:wrap}.nono-language-control{order:3;flex:1 1 100%;justify-content:flex-start}.nono-language-control select{flex:1;max-width:100%}}';
document.head.append(stylesheet);
const observer=new MutationObserver(records=>{
 for(const item of records){
  if(item.type==='childList'){
   for(const node of item.addedNodes)queue(node);
  }else if(item.type==='characterData')queue(item.target);
  else if(item.type==='attributes')queue(item.target);
 }
 if(document.querySelector('#nono-settings-overlay')&&!document.querySelector('#nono-language-select'))renderSelector();
});
observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attrNames});
window.addEventListener('storage',e=>{
 if(e.key===KEY){choice=languageChoice();setLanguage(choice);}
});
document.documentElement.lang=active;document.documentElement.dataset.nonoLang=active;
document.title=active==='ko'?'NONO — 노노그램':active==='ja'?'NONO — ノノグラム':'NONO — Nonogram';
window.NONO_I18N={setLanguage,get locale(){return active;},get choice(){return choice;},translate:message=>translate(message,active),refresh:()=>queue(document.body)};
queue(document.body);
})();