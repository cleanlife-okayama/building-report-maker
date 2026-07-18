# CL Field Report AI

**AI explains. Professionals decide.**

**Live demo:** *to be added*

**Demo video:** *to be added*

**Prototype language:** Japanese UI with English README guidance and English-captioned demo video

CL Field Report AI is a human-in-the-loop reporting tool for small painting, waterproofing, roofing, and remodeling contractors. It turns field-verified findings, photos, notes, and professional decisions into clear, customer-ready reports—without allowing AI to change the ratings or overall judgment selected by the professional.

## Problem

Skilled contractors often understand the condition of a building through experience, photos, and on-site judgment. But small companies do not always have a clear way to turn that knowledge into words and documents that customers can understand and trust.

When the only deliverable is an estimate, the conversation can easily become a price comparison. This tool is designed for small teams that cannot assign a dedicated report writer or IT department, but still want to explain their work honestly and clearly.

## Solution

The app connects photos, inspection items, recommended actions, overall judgment, preview, and PDF output in one local workflow.

AI is used to make explanations clearer. It does not make the final diagnosis. The selected ratings and the overall judgment remain controlled by the professional user.

For specific combinations of selected item-level findings and the overall judgment, the app displays a rule-based warning and asks the professional to review the decision.

## What Existed Before Build Week

Baseline commit: `2ffd642`

Before Build Week, the app already included:

- A local HTML/CSS/JavaScript field report app
- Photo upload, sorting, preview, and print/PDF output
- Inspection items with condition and action choices
- Customer-facing report sections for findings and recommendations
- Local browser storage using `localStorage` and `IndexedDB`
- Company information settings
- AI consultation prompts for rewriting report text

## What Was Added During Build Week

From `2ffd642` to `24409da`, the project was improved in several areas:

- Passing multiple related photos into the inspection-item AI prompt
- Shared AI rules for safer, customer-friendly writing
- Protection so AI paste-back does not overwrite the six human-selected assessment values
- Redefining the overall judgment as a five-choice human decision
- Keeping the overall judgment fixed when AI text is pasted back
- Rule-based warnings for selected item-level findings that may not match the selected overall judgment
- Explicit photo placement: unclassified, building overview, or inspection item
- Building overview photos placed after the summary assessment and before detailed inspection items
- Safer save, restore, JSON, and PDF-related behavior

## How GPT-5.6 Was Used

This prototype does not call the OpenAI API directly.

Instead, the app creates a structured consultation prompt from photos and professional input. The user reviews what will be sent, then gives it to GPT-5.6. GPT-5.6 rewrites the information into customer-friendly language.

The user then reviews the answer and pastes it back into the app. If a field already has content, the app asks before overwriting it. AI responses are not accepted automatically, and selected ratings and the overall judgment are not changed by AI paste-back.

This manual step is intentional: it keeps a visible human review step and makes the workflow human-in-the-loop, not automatic diagnosis.

The app does not automatically upload report data. The user chooses what to send to GPT-5.6.

## How Codex Was Used

Codex was used as a development partner during Build Week. It investigated Git history and existing code, checked the impact of changes on saved data and older JSON files, implemented focused changes, and tested syntax, diffs, save/load behavior, JSON, PDF output, and report order.

One concrete example was the photo placement feature. The field user noticed that treating unclassified photos as building overview photos was a hidden behavior that first-time users might not understand. GPT-5.6 helped turn that UX concern into minimum requirements. Codex then checked the existing code, storage format, and backward compatibility, backed up the files before and after implementation, implemented the change, and tested saving, JSON, PDF, display order, duplicate prevention, and compatibility with Playwright. The human product owner reviewed the real screen and PDF output before accepting it.

## Human Decisions

The key product and safety decisions were made by the human product owner, a working renovation contractor.

These included:

- Choosing the real field problem to solve
- Deciding that AI must not change selected ratings or the overall judgment
- Finding UX problems that first-time users might misunderstand
- Keeping the report honest, including when some work may not be necessary
- Reviewing the actual screen and deciding what to adopt or reject

## Real-World Pilot

The tool was used in one real residential inspection pilot.

The customer said the report was polished enough to use in an internal company meeting.

The contractor also explained that the Galvalume-coated steel roof might not need repainting. Even so, the customer requested a roof estimate and said they were currently leaning toward hiring the contractor.

This is one pilot case and does not guarantee general business results.

## Privacy and Safety

- Photos and report data are stored mainly in the user's browser.
- The app does not automatically send data to GPT-5.6.
- The user chooses what content to send.
- AI responses are not accepted automatically.
- Public demos should use anonymized data.
- This app does not provide formal structural diagnosis or certified inspection results.
- Final responsibility stays with the professional user.

## Run and Test

- No installation or build step is required.
- No backend server is required.
- Open `index.html` in a browser, or serve this folder as a static site.
- Recommended browser: latest Google Chrome or Microsoft Edge, especially for folder save, clipboard, and browser storage features.
- The app uses `localStorage` for text data and `IndexedDB` for photo data.
- A separate sample data file is not required to run the app. For review, prepare anonymized photos and notes, or use the demo video.

Fast test path for reviewers:

1. Open the app.
2. Add one or more photos.
3. Choose each photo's placement: unclassified, building overview, or inspection item.
4. Enter an inspection item and select item-level findings.
5. Select the six assessment values and the overall judgment as the professional user.
6. Copy an AI consultation prompt.
7. Send the reviewed prompt to GPT-5.6.
8. Paste the GPT-5.6 response back into the app.
9. Confirm that selected ratings and the overall judgment do not change.
10. Check the rule-based warning when item-level findings may not match the overall judgment.
11. Open the preview or print/PDF view.

## Evidence

- Baseline commit: `2ffd642`
- Build Week feature milestone: `24409da`
- Demo video: *to be added*

---

# 建物調査報告書アプリ

現場で確認した内容、写真、現在の状態、提案内容を入力し、お客様向けの建物調査報告書として確認・印刷できるローカルHTMLアプリです。

## GitHub Pagesでの表示

- このフォルダは、`index.html` を入口とする静的アプリとしてGitHub Pagesで表示できます。
- `main` ブランチへ反映すると、`.github/workflows/deploy-pages.yml` がアプリ一式をGitHub Pagesへ配信します。
- GitHubリポジトリの「Settings」→「Pages」で、公開元に「GitHub Actions」を設定してください。
- GitHub PagesはHTTPSで配信されるため、対応ブラウザではクリップボードやフォルダ選択などの既存機能を利用できます。ブラウザの権限確認が表示された場合は、内容を確認して許可してください。
- 公開URLでも、入力した報告書データ、写真、会社情報は各利用者のブラウザ内に保存されます。外部サーバーへ自動送信される仕様ではありません。

## 開き方

1. `index.html` をブラウザで開きます。
2. インターネット接続や外部サーバーは不要です。
3. 入力内容は同じブラウザに自動保存されます。文章などの軽いデータは `localStorage`、写真本体はブラウザ内の `IndexedDB` に保存されます。

## 基本の使い方

1. 「基本情報」にお客様名、工事名、調査日時、担当者などを入力します。
2. 「お客様のご不安・ご相談内容」に、最初に聞いた不安や相談内容を入力します。
3. 「調査写真」「確認箇所」に、写真ごとの撮影箇所・調査結果・判断・現在の状態、箇所ごとの現在の状態・今後の対応・確認した内容・注意点・対応の考え方を入力します。特に伝える必要があるピックアップ写真では、写真単体の「この箇所の対応方針」も入力できます。
4. 「おすすめする施工方針」に、メインでおすすめする施工内容を入力します。
5. 「あわせておすすめしたい対策」に、遮熱塗料、落ち葉除けカバー、排水改善、防カビ・除藻処理など、現地状況を踏まえた追加提案を入力します。
6. 「工事中に確認が必要なこと」に、工事中に確認が必要な点や、今後注意しておきたい点を入力します。
7. 最後に「建物全体としての総合判断」を5択から選び、「今回の調査結果にもとづく総合判断」へ対応時期、優先箇所、その判断理由を入力します。
8. 右側の「報告書プレビュー」で、お客様に見せる順番と文章を確認します。

## 会社情報設定

- 画面最下部の「会社情報設定」で、会社名、屋号、担当者、住所、電話番号、メールアドレス、ホームページ、対応サービス、キャッチコピーを登録できます。
- 会社ロゴは2点まで画像ファイルから登録でき、個別のプレビューと削除に対応しています。
- 登録した会社名は表紙の「会社・担当者」欄に表示されます。
- 会社情報とロゴは報告書の最終ページに「発行会社情報」として表示されます。ロゴを2点登録した場合は横並びになり、印刷/PDFにも反映されます。
- 各ページ下部のフッターに表示される会社名も、登録した会社名または屋号に連動します。
- 「会社情報を基本設定として保存」を押すと、会社情報とロゴがブラウザ内の共通設定として保存されます。
- 共通設定を保存すると、新しい報告書を作成した際にも会社情報が自動で反映されます。必要に応じて会社情報を編集し、再度保存できます。
- 屋号またはブランド名は任意です。未入力の場合は会社名が表示に使用されます。
- 保存済みの報告書を開いた場合は、その報告書に保存されている会社情報が表示されます。
- 販売版では、利用する会社ごとの会社名・連絡先・ロゴを登録して使用できます。
- 会社情報やロゴの登録に外部サーバーは使用しません。

## 写真・確認箇所の並び替え

写真はファイル選択のほか、「現場写真を追加」エリアへのドラッグ＆ドロップでも追加できます。
複数枚の写真をまとめて選択またはドラッグして追加できます。

写真カードと確認箇所カードには「上へ」「下へ」ボタンがあります。

建物全体の写真から始めて、劣化箇所、サビ、穴あき、雨樋の詰まり、追加提案につながる写真のように、お客様が読みやすい順番へ並び替えられます。

並び替えた順番は、右側プレビュー、印刷/PDF、JSON書き出し・読み込みにも反映されます。

## PDF用の見え方

印刷/PDFでは、A4縦で見やすいように表紙、写真ページ、文章ページの配置を調整しています。

- 表紙には、お客様名、工事名、調査日時、担当者、確認箇所数、早めに対処が必要な件数、写真枚数が表示されます。
- 「今回の確認結果にもとづく目安」では、建物全般に共通する「緊急性」「安全性」「使用上の支障」「劣化・損傷の程度」「建物への影響」「維持管理上の注意度」を、5段階の目安とレーダー風チャートで表示します。
- 写真ページでは、重要度が高そうな写真を自動で大きめに表示します。
- 印刷時は、見出し、カード、写真、注意点が読みやすい余白と文字サイズになるようにしています。

## その他の自由入力

各選択肢で「その他（自由入力）」を選ぶと、下に自由入力欄が出ます。

- 確認箇所
- 現在の状態
- 相談内容
- 建物種別

入力した内容は、プレビュー、PDF出力、JSON書き出し・読み込みにも反映されます。

## 言葉づかい

アプリ内の項目名は、現場担当者とお客様の両方に伝わりやすい表現にしています。

- 確認した箇所ごとに「今後の対応」を選べます。
- 今後の対応は「現時点で対応不要」から「直ちに対応が必要」まで、対応時期と内容に合わせて選べます。
- 専門用語はできるだけ避け、必要な場合は「シーリング（目地の防水材）」のように補足を入れています。
- 工事中に確認が必要なことは、専用の入力欄にまとめられます。

## PDF保存・印刷

1. 画面上部またはプレビュー上部の「印刷 / PDF」を押します。
2. ブラウザの印刷画面で、送信先を「PDFに保存」または使用するプリンターにします。
3. 用紙はA4、倍率は必要に応じて「既定」または「ページに合わせる」を選びます。

### PDFに表示する文章の文字数目安

- PDFに表示される主要入力欄には、レイアウト崩れを防ぐための文字数目安とカウンターがあります。
- 文字数の目安を超えても入力できますが、PDFでは文字が詰まったり重なったりする可能性があります。
- 文字数が多い項目がある状態で「印刷 / PDF」を押すと、修正するか、そのまま保存するかを確認できます。
- 詳しい説明を1つの欄へ詰め込みすぎず、確認項目、写真コメント、施工方針、総合判断などへ分けて記入する運用をおすすめします。
- 「最後にお伝えしたいこと」は、最後に読む説明ページとして500〜700文字程度、長くても800文字以内を目安にできます。
- 表紙に表示される「相談内容」と「調査目的」は短めにまとめてください。
- 「建物状態の見える化」は要約を短くし、詳しい説明は後半の確認項目や施工方針へ分けてください。

## 工程図解

- 工程図解は新規作成時には表示されません。
- 「3. おすすめする施工方針」にある「工程図解を表示する」を選ぶと、入力画面・プレビュー・PDFに表示されます。
- 「穴や断裂があった場合の補修工程」または「自由作成」のテンプレートを利用できます。
- 図解タイトル、説明文、工程番号、工程名、補足説明、区切り文を編集できます。
- 工程カードと区切り文は追加・削除・上下の並び替えができます。
- 表示状態と編集内容は、自動保存と報告書データの保存対象です。

## データの保管

- 入力内容は自動保存されます。
- 写真が多い場合や別の端末で使う場合は、「名前を付けて保存」で報告書フォルダを作成してください。
- 「名前を付けて保存」では、候補の報告書名を自由に書き換えた後、保存先の親フォルダを選びます。選んだ場所に、入力した名前の報告書フォルダが作成されます。
- 一度保存先を決めた後は、「上書き保存」で同じ報告書フォルダへ保存できます。
- 保存した報告書フォルダは「開く」から戻せます。
- 以前の状態に戻したい場合は、「バックアップから復元」で報告書フォルダ内のバックアップを選べます。
- 未保存の変更がある状態で別ページへ移動したり、タブやウィンドウを閉じたりすると、ブラウザ標準の終了確認を求めます。「キャンセル」で画面へ戻り、名前を付けて保存または上書き保存を行ってください。ブラウザや端末の強制終了では、確認が表示されない場合があります。

## 入力欄の自動高さ調整

確認した内容、現在の状態、この箇所の対応方針などの長文入力欄は、入力内容に合わせて高さが自動で広がります。通常写真は撮影箇所と確認できた状態を簡潔に記録し、対応の判断は確認項目側でまとめます。過去データに入力済みの対応文は、引き続き確認・編集できます。

保存データを開いた後や、AI回答を貼り戻した後も、表示内容に合わせて再調整されます。必要な場合は、これまで通り手動で高さを調整できます。

## 写真に印をつける

- 写真カードの「写真に印をつける」から、写真上に赤い〇と矢印を追加できます。
- 〇と矢印は白いフチ付きで表示されるため、暗い写真やサビ色の箇所でも見分けやすくなっています。
- 「選択 / 移動」で印を選ぶと、移動や大きさ・向きの調整ができます。
- 「1つ戻す」「選択中の印を削除」「すべて消す」で修正できます。
- 注釈画面の「保存」を押すと、写真カード、報告書プレビュー、印刷 / PDFへ反映されます。
- 元の写真は加工せず、〇と矢印の位置情報を写真ごとに別保存します。報告書データを保存して開き直した場合も注釈は保持されます。

## AI相談機能の共通方針

AI相談機能は、新しく診断を確定するものではありません。担当者が入力・選択した事実、見立て、施工方針を、一般のお客様にも伝わる文章へ整えるための補助機能です。

文章相談には、担当者の入力を優先し、確認できた事実を明確に伝える共通の建築専門補佐ルールが含まれます。入力にない原因、内部状態、将来の被害、工法、材料などは断定せず、写真、確認項目、施工方針、ご相談内容など、機能ごとの専用ルールも加えて外部AIへ渡します。写真のAI相談画像には、文章相談とは別の短い画像専用指示を使用します。

AIの種類、使用環境、入力内容によって回答が変わるため、完全に同じ回答になる保証はありません。AIの回答は下書きとして扱い、最終的な見解、表現、提案内容は担当者が確認・判断してください。

## 写真カードのAI相談機能

写真カードでは、外部AIへ相談するための補助機能として「AI相談画像」と「相談文をコピー」を使用できます。

### AI相談画像

「AI相談画像」では、写真、写真タイトル、撮影箇所、調査結果・判断、現在の状態をまとめた画像を作成できます。ピックアップ写真と、過去データ互換で対応方針を表示する写真では、「この箇所の対応方針」も画像に含まれます。

画像上部には、アプリ画面の評価ではなく、下の現場写真について報告書用コメントを作成する依頼であることを短く明記します。写真に〇や矢印がある場合は、その箇所を優先して確認する指示も自動で含まれます。印があるだけで劣化、原因、危険性を確定するものではなく、担当者の入力内容を優先します。

印の位置を外部AIに確認させる場合は、相談文だけでなくAI相談画像も送ってください。

### 相談文をコピー

「相談文をコピー」では、短い建築専門補佐ルール、写真専用ルール、現在の入力内容をまとめた依頼文をコピーできます。

通常写真は、次の4項目で回答するよう依頼します。

- 写真タイトル
- 撮影箇所
- 調査結果・判断
- 現在の状態

ピックアップ写真と、過去データ互換で対応方針を表示する写真（legacyVisible）では、次の1項目を加えた5項目で依頼します。

- この箇所の対応方針

通常写真に過去の対応文が内部保持されていても、画面やPDFで非表示となる対応方針は、AI相談やほかのAIへの参考情報に含めません。

基本的には、まずAI相談画像を外部AIへ送って使用できます。画像だけで指定項目の回答にならない場合は、「相談文をコピー」でコピーした文章も一緒に送ってください。

### AI回答を貼り戻す

外部AIの回答全文を貼り付け、見出しごとに反映候補を確認できます。現在の貼り戻し対象は次のとおりです。

- 写真AI：通常写真の4項目と、表示対象写真の「この箇所の対応方針」
- 確認項目AI：「確認した内容」「考えられること・注意点」「対応の考え方」
- 施工方針AI：主要3欄と補足4欄
- 目安AI：「総合目安」「緊急性について」「おすすめの方向性」の3文章
- 総合判断AI：「今回の調査結果にもとづく総合判断」

ご相談内容AIには、現在、専用のAI回答貼り戻し機能はありません。目安AIの6評価値と、担当者が選ぶ建物全体の総合判断区分も貼り戻し対象外で、現在値を維持します。

既存の入力内容がある欄へ反映する場合は確認が出ます。写真の旧回答に含まれる見出しも引き続き読み取れます。反映後は担当者が内容を確認・修正してください。

## 確認項目カードのAI文章整形

確認項目カードの「AIで文章を整える」から、確認項目や関連写真に入力した状態・判断をまとめ、外部AIへ相談しやすい文章としてコピーできます。

「確認した内容」が空欄でも、確認項目の「現在の状態」「今後の対応」や、関連写真の「調査結果・判断」「現在の状態」などに有効な情報があれば使用できます。写真タイトルや撮影箇所だけでは起動しないため、写真で確認できた状態や判断も入力してください。

関連写真は最大5枚を参考にし、共通する状態と場所ごとの違いを整理します。一部の写真だけに見られる状態を確認項目全体へ広げず、選択済みの「今後の対応」を判断軸として、次の3項目を作成します。

- 確認した内容
- 考えられること・注意点
- 対応の考え方

## 施工方針のAI文章整形

「施工方針の文章をAIで整える」から、現在入力されている施工方針、確認項目、関連写真を参考に、お客様へ伝わりやすい施工方針の文章を作成できます。

主要3欄は、次の役割に分けて整理します。

- ご提案内容：工事の大きなテーマや対応する内容
- おすすめする施工方針：確認結果と、対応を考える理由
- 主な工事内容：実際に行う作業内容

主要3欄の回答は、外部AI画面でまとめてコピーしやすいよう、1つの`text`コードブロックで出力するよう依頼します。アプリへ貼り戻す際は、コードブロック記号と識別行を除去し、読みやすさのための単独改行を自然につなぎます。空行と箇条書きは維持します。

次の補足4欄も、それぞれ1項目ずつAI相談できます。

- あわせておすすめしたい対策
- 工事中に確認が必要なこと
- 今後注意しておきたい点
- 最後にお伝えしたいこと

AI用の説明文は、お客様向けプレビューや印刷 / PDFには表示されません。

## 報告書の重要項目をAIで整える

ご相談内容、今回の確認結果にもとづく目安、今回の調査結果にもとづく総合判断にも、AI文章整形用の相談文コピー機能があります。参照する情報は機能ごとに異なり、報告書全体を毎回すべて外部AIへ渡すものではありません。

### お客様のご不安・ご相談内容AI

入力された不安、相談、希望を、意味の範囲を変えずに自然な文章へ整えます。短い入力を無理に長くせず、入力にない不安、原因、将来の心配、確認希望、対応希望、補修希望は追加しません。確認希望や対応希望が明記されている場合は、その内容を維持し、文章量より入力への忠実さを優先します。

### 今回の確認結果にもとづく目安AI

担当者が選択した次の6評価値と、3つの説明文章を9見出しで外部AIへ渡します。

- 緊急性
- 安全性
- 使用上の支障
- 劣化・損傷の程度
- 建物への影響
- 維持管理上の注意度
- 総合目安
- 緊急性について
- おすすめの方向性

6評価値は担当者が選択する専門的な判断で、AIは変更しません。AI回答を貼り戻す場合も、反映されるのは「総合目安」「緊急性について」「おすすめの方向性」の3文章だけです。レーダーチャートは、担当者が選択した6評価値をもとに表示されます。

### 今回の調査結果にもとづく総合判断AI

建物全体の結論は、担当者が「現時点では工事不要」「経過確認が必要」「詳しい確認後に判断」「早めの対応が適切」「直ちに対応が必要」の5択から選びます。これは最も強い個別箇所を自動反映する値ではなく、部分的に異なる判断は下の文章で補足します。AIは選択値を変更せず、確認項目、関連写真、今回の確認結果にもとづく目安から、対応時期、優先箇所、判断理由を文章化します。AI回答を貼り戻しても5択は変わりません。過去データでは判断区分が未選択の場合がありますが、既存文章はそのまま表示・編集できます。施工方針は矛盾を防ぐためにだけ参照し、具体的な材料、工法、施工手順は「おすすめする施工方針」「主な工事内容」へ分けます。通常写真で非表示となる対応方針は参考情報に含めません。

建物全体の総合判断が軽い区分で、確認項目の「今後の対応」または写真の「調査結果・判断」に明示された、より強い個別判断がある場合は、担当者向けの入力画面と入力チェックに確認案内を表示します。文章内容や件数から推測する機能ではなく、選択された値だけを確認します。この案内は5択を自動変更せず、保存・印刷・PDF出力も止めません。また、お客様向けのプレビューやPDFには表示されません。

## 文章方針

本アプリでは、確認できた事実は明確に伝え、不確かな内容だけを事実と分けて表現します。

- 担当者が入力・選択した内容を最優先する
- 入力にない原因、内部状態、将来の被害、工事、効果を作り足さない
- 選択済みの状態、判断、今後の対応と矛盾させない
- 不安をあおらず、一般のお客様が判断しやすい言葉にする
- 写真だけで判断しきれない点は、現地確認や追加確認が必要な場合があると伝える

アプリから外部AI APIや外部サーバーへ自動送信する機能はありません。コピーした相談文やAI相談画像は利用者が外部AIへ送り、回答は担当者が最終確認して使用してください。
