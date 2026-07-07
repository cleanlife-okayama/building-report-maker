(function () {
  "use strict";

  const STORAGE_KEY = "cleanlife-building-report:v1";
  const COMPANY_SETTINGS_KEY = `${STORAGE_KEY}:company-settings:v1`;
  const BACKUP_PREVIOUS_KEY = `${STORAGE_KEY}:previous`;
  const BACKUP_PREFIX = `${STORAGE_KEY}:backup:`;
  const PHOTO_DB_NAME = "cleanlife-building-report-photos";
  const PHOTO_DB_VERSION = 1;
  const PHOTO_STORE_NAME = "photos";
  const DIRECTORY_HANDLE_DB_NAME = "cleanlife-building-report-directory";
  const DIRECTORY_HANDLE_DB_VERSION = 1;
  const DIRECTORY_HANDLE_STORE_NAME = "handles";
  const CURRENT_DIRECTORY_HANDLE_KEY = "current-report-directory";
  const COMPANY_SETTINGS_FIELDS = [
    "name",
    "brandName",
    "contactPerson",
    "postalCode",
    "address",
    "phone",
    "email",
    "website",
    "services",
    "tagline",
    "logoDataUrl",
    "logoName",
    "logo2DataUrl",
    "logo2Name",
  ];

  const today = new Date().toISOString().slice(0, 10);
  const OTHER_VALUE = "__other";
  const priorities = [
    { value: "low", label: "経過観察", short: "経過観察" },
    { value: "medium", label: "状態確認", short: "状態確認" },
    { value: "cleaning", label: "清掃・調整", short: "清掃・調整" },
    { value: "repair", label: "補修を検討", short: "補修を検討" },
    { value: "replace", label: "交換を検討", short: "交換を検討" },
    { value: "high", label: "早めに対応", short: "早めに対応" },
    { value: "urgent_review", label: "早急な対応を検討", short: "早急な対応を検討" },
    { value: "urgent", label: "優先して対応", short: "優先して対応" },
  ];

  const areaOptions = ["外壁", "屋根", "シーリング（目地の防水材）", "ベランダ防水", "雨樋", "窓まわり", "基礎", "付帯部（雨樋・破風など）", "その他"];
  const conditionOptions = ["問題なし", "要確認", "軽微な劣化", "経年劣化が見られる", "劣化・不具合が見られる", "使用上の支障あり", "安全面の確認が必要"];
  const projectOptions = ["外壁塗装", "屋根塗装", "防水工事", "雨漏り確認", "美装・補修", "リフォーム", "節電ガラスコート", "その他"];
  const buildingTypeOptions = ["戸建て", "アパート", "店舗", "倉庫", "事務所", "その他"];
  const surveyTimeOptions = createTimeOptions();
  const inputSectionNavigation = [
    { id: "section-project", label: "基本情報" },
    { id: "section-concern", label: "ご相談内容" },
    { id: "section-findings", label: "確認結果" },
    { id: "section-photos", label: "調査写真" },
    { id: "section-assessment", label: "目安" },
    { id: "section-proposal", label: "施工方針" },
    { id: "section-summary", label: "まとめ" },
    { id: "section-quality", label: "入力チェック" },
    { id: "section-data", label: "保存" },
    { id: "section-company", label: "会社情報" },
  ];
  const assessmentItemLegacyIds = {
    urgency: [],
    safety: ["environmentImpact"],
    usageImpact: ["roofRust"],
    deterioration: ["paintDeterioration"],
    buildingImpact: ["corrosion"],
    maintenanceAttention: ["drainage"],
  };
  const assessmentDisplayPlaceholders = {
    urgency: "例：現時点で緊急性は高くありませんが、今後の経過確認をおすすめします。",
    safety: "例：現時点で大きな危険は見られませんが、今後の変化には注意が必要です。",
    usageImpact: "例：現在の使用に大きな支障はありませんが、劣化が進むと使いにくさにつながる可能性があります。",
    deterioration: "例：一部に割れ・浮き・欠損などの損傷が確認されます。",
    buildingImpact: "例：現時点では表面的な劣化に見えますが、必要に応じて詳しい確認が必要です。",
    maintenanceAttention: "例：今後も定期的な確認をおすすめします。",
  };
  const assessmentAiHeadings = [
    { id: "urgency", label: "緊急性" },
    { id: "safety", label: "安全性" },
    { id: "usageImpact", label: "使用上の支障" },
    { id: "deterioration", label: "劣化・損傷の程度" },
    { id: "buildingImpact", label: "建物への影響" },
    { id: "maintenanceAttention", label: "維持管理上の注意度" },
  ];
  const PDF_WARNING_RATIO = 0.85;
  const AI_REVIEW_NOTICE =
    "必ず内容を確認してください。\n" +
    "AIの回答は、判断を補助するための参考です。\n" +
    "最終的な見解・表現・提案内容は、担当者が確認のうえご使用ください。";
  const AI_WRITING_GUIDANCE =
    "【共通の文章方針】\n" +
    "AIの役割は、入力内容を短く削ることではなく、お客様に伝わりやすい文章へ整えることです。\n" +
    "無理に文字数を増やさず、各欄の文字数目安内で必要な説明は省略しすぎないでください。\n" +
    "入力内容にある理由、背景、お客様の不安、現場状況をできるだけ活かし、お客様が「なぜこの対応が必要なのか」「そのままにすると何が心配なのか」「対応すると何が安心なのか」を判断できる文章にしてください。\n" +
    "現場の状態、そのままにした場合の心配、対応する理由、工事で確認すること、お客様にとっての安心材料が自然につながるように整えてください。\n" +
    "特に「対応の考え方」や「この箇所の対応目安」は、作業内容だけで終わらせず、その対応を検討する理由、そのままにした場合に考えられる心配、対応することで期待できる安心感を、入力内容から分かる範囲で含めてください。\n" +
    "一般のお客様が読んだときに、責められている、強く不安をあおられていると感じにくい、やわらかく落ち着いた表現にしてください。\n" +
    "「古い」「管理が悪い」「放置されている」など、責任を強く感じさせる表現は避け、「使用感がある」「劣化が見られる」「整備が必要な状態」など、状態を客観的に伝える表現へ置き換えてください。\n" +
    "入力内容から読み取れる場合は、見た目の印象、清潔感、安全性、水漏れなどの心配も補足できます。ただし断定せず、「可能性があります」「確認が必要です」「検討します」「おすすめします」などの表現を使ってください。\n" +
    "必要に応じて、短い例を自然な範囲で入れてください。専門的な説明だけでなく、お客様の不安や納得感に届く表現を意識してください。\n" +
    "文字数の上限に近くなっても構いませんが、文字数を埋めるための不自然な言い回しや繰り返しは避けてください。\n" +
    "入力内容にない劣化原因、工事内容、効果、危険性を断定して追加しないでください。不明な点は「可能性があります」「確認が必要です」「検討できます」などの表現にしてください。\n" +
    "文字数は目安として扱い、不自然に削らず、短さよりも分かりやすく伝わることを優先してください。";
  const AI_OUTPUT_SAFETY_GUIDANCE =
    "【重要な注意事項】\n" +
    "・入力内容にない劣化原因、工事内容、効果、危険性を断定しないでください。\n" +
    "・価格、保証、法的判断、効果の断定はしないでください。\n" +
    "・写真や入力内容から分からないことは断定しないでください。\n" +
    "・断定できない内容は「可能性があります」「確認が必要です」「おすすめします」「検討できます」などの表現を使ってください。\n" +
    "・「前項と同様」「上記の通り」「前頁と同様」「同じです」などは使わず、その欄だけで意味が通る文章にしてください。\n" +
    "・専門的すぎる言葉は、一般のお客様にも伝わる言葉へ整えてください。\n" +
    "・「古い」「管理が悪い」「放置されている」などの責任を強く感じさせる表現は避け、状態を客観的かつやわらかく伝えてください。\n" +
    "・見た目、清潔感、安全性、水漏れなどに触れる場合も、入力内容から分かる範囲にとどめ、断定しすぎないでください。\n" +
    "・同じ内容の繰り返しを減らし、報告書全体の流れが自然になるようにしてください。\n" +
    "・売り込み感を強くしすぎず、お客様が納得して判断できる文章にしてください。\n" +
    "・不要な工事を強くすすめる表現は避けてください。";
  const AI_PHOTO_PROMPT =
    "これはアプリ機能の一つです。作成したコメントは、建物調査報告書メーカーの各入力欄へコピーして使用します。前置きや補足説明はできるだけ省き、そのまま貼り付けやすい形で回答してください。\n\n" +
    "この画像を読み取ったAIは、まずこのプロンプトに従ってください。下の写真と入力内容を確認し、建物調査報告書に載せるコメント案を作成してください。\n\n" +
    "入力済み・空欄を問わず、写真と入力内容から分かる範囲で、次の全項目を整えてください。\n" +
    "・写真タイトル\n・撮影箇所\n・調査結果の目安\n・現在の状態\n・この箇所の対応目安\n\n" +
    "回答は必ず次の見出しごとに分け、すべての項目を省略せず回答してください。\n" +
    "【写真タイトル】\n【撮影箇所】\n【調査結果の目安】\n【現在の状態】\n【この箇所の対応目安】\n\n" +
    "見出し名は変更せず、この5つ以外の見出しは回答に含めないでください。\n\n" +
    "空欄があっても「未入力です」で止めず、写真と入力内容から分かる範囲で全項目の案を作成してください。入力済みの内容も省略せず、必要に応じて分かりやすく整えてください。\n\n" +
    "一般のお客様にも伝わる、やさしく自然な説明文にしてください。写真だけで断定できない内容は断定せず、「可能性があります」「確認が必要です」「おすすめします」などの表現を使ってください。\n\n" +
    "入力内容に「前項と同様」「上記の通り」「前頁と同様」「同じです」などの表現がある場合も、そのまま使わず、この項目だけで意味が通る文章に言い換えてください。\n\n" +
    AI_WRITING_GUIDANCE +
    "\n\n各項目は、報告書のPDF・印刷時にレイアウトが崩れないよう、次の文字数を目安に整えてください。\n" +
    "【写真タイトル】30字以内\n" +
    "【撮影箇所】30字以内\n" +
    "【調査結果の目安】20字以内\n" +
    "【現在の状態】160字以内\n" +
    "【この箇所の対応目安】180字以内\n\n" +
    "各欄の文字数目安内で、必要な説明は省略しすぎず、お客様が納得して判断できる文章にしてください。短くまとめることよりも、分かりやすく伝わることを優先してください。無理に文字数を増やさず、理由・背景・不安への配慮・対応する意味が自然に伝わる文章を優先してください。短い例を入れた方が伝わりやすい場合は、自然な範囲で入れてください。ただし、入力内容にない原因・工事内容・効果・危険性を断定して追加しないでください。";
  const PDF_TEXT_FIELD_RULES = {
    projectWorkName: { label: "工事名", maxLength: 60, warningRatio: 0.85 },
    projectClientName: { label: "お客様名", maxLength: 40, warningRatio: 0.85 },
    projectAddress: { label: "住所", maxLength: 80, warningRatio: 0.85 },
    projectBuildingTypeOther: { label: "建物種別の自由入力", maxLength: 30, warningRatio: 0.85 },
    projectTypeOther: { label: "相談内容の自由入力", maxLength: 90, warningRatio: 0.85 },
    projectWeather: { label: "天気", maxLength: 20, warningRatio: 0.85 },
    projectPurpose: { label: "調査目的", maxLength: 120, warningRatio: 0.85 },
    customerConcern: { label: "お客様のご不安・ご相談内容", maxLength: 260, warningRatio: 0.85 },
    assessmentDisplayText: { label: "表示文", maxLength: 16, warningRatio: 0.85 },
    assessmentOverall: { label: "総合目安", maxLength: 120, warningRatio: 0.85 },
    assessmentUrgency: { label: "緊急性について", maxLength: 160, warningRatio: 0.85 },
    assessmentPolicy: { label: "おすすめの方向性", maxLength: 200, warningRatio: 0.85 },
    findingAreaOther: { label: "確認項目タイトル", maxLength: 40, warningRatio: 0.85 },
    findingConditionOther: { label: "状態の自由入力", maxLength: 30, warningRatio: 0.85 },
    findingObservation: { label: "確認した内容", maxLength: 220, warningRatio: 0.85 },
    findingConcern: { label: "考えられること・注意点", maxLength: 260, warningRatio: 0.85 },
    findingProposal: { label: "対応の考え方", maxLength: 260, warningRatio: 0.85 },
    photoTitle: { label: "写真タイトル", maxLength: 30, warningRatio: 0.85 },
    photoAreaOther: { label: "撮影箇所の自由入力", maxLength: 30, warningRatio: 0.85 },
    photoConditionOther: { label: "調査結果の目安の自由入力", maxLength: 20, warningRatio: 0.85 },
    photoFinding: { label: "現在の状態", maxLength: 160, warningRatio: 0.85 },
    photoRecommendation: { label: "この箇所の対応目安", maxLength: 180, warningRatio: 0.85 },
    proposalPlanName: { label: "ご提案内容", maxLength: 60, warningRatio: 0.85 },
    proposalRecommendation: { label: "おすすめする施工方針", maxLength: 260, warningRatio: 0.85 },
    proposalScope: { label: "主な工事内容", maxLength: 220, warningRatio: 0.85 },
    proposalAdditional: { label: "あわせておすすめしたい対策", maxLength: 260, warningRatio: 0.85 },
    proposalCautions: { label: "工事中に確認が必要なこと", maxLength: 260, warningRatio: 0.85 },
    proposalWatchPoint: { label: "今後注意しておきたい点", maxLength: 220, warningRatio: 0.85 },
    proposalClosing: { label: "最後にお伝えしたいこと", maxLength: 260, warningRatio: 0.85 },
    processTitle: { label: "図解タイトル", maxLength: 40, warningRatio: 0.85 },
    processDescription: { label: "図解の説明文", maxLength: 120, warningRatio: 0.85 },
    processStepTitle: { label: "工程名", maxLength: 20, warningRatio: 0.85 },
    processStepNote: { label: "補足説明", maxLength: 80, warningRatio: 0.85 },
    processDivider: { label: "区切り文", maxLength: 80, warningRatio: 0.85 },
    summaryOverall: { label: "全体のまとめ", maxLength: 300, warningRatio: 0.85 },
  };
  const processDiagramTemplates = [
    {
      id: "holeRepair",
      name: "穴や断裂があった場合の補修工程",
      diagram: {
        title: "穴や断裂があった場合の補修工程",
        description:
          "穴や断裂がある場合は、通常の屋根塗装工程の途中で補修工程を行います。穴部分をシール材で充填し、ブチルテープ・アルミリペアテープで補強したうえで、非鉄金属用プライマーを塗布し、その後に全体のサビ止め・中塗り・上塗りへ進みます。",
        items: [
          { id: "hole-step-1", type: "step", number: "1", title: "ケレン・清掃", note: "", variant: "normal" },
          { id: "hole-step-2", type: "step", number: "2", title: "サビ止め補修塗り", note: "", variant: "normal" },
          {
            id: "hole-note-1",
            type: "divider",
            text: "穴や断裂があった場合、ここから補修する工程となります。",
            variant: "branch",
          },
          { id: "hole-step-3", type: "step", number: "3", title: "シール材充填", note: "", variant: "repair" },
          { id: "hole-step-4", type: "step", number: "4", title: "ブチルテープ貼り付け", note: "", variant: "repair" },
          { id: "hole-step-5", type: "step", number: "5", title: "アルミリペアテープ", note: "", variant: "repair" },
          { id: "hole-step-6", type: "step", number: "6", title: "非鉄金属プライマー", note: "", variant: "repair" },
          {
            id: "hole-note-2",
            type: "divider",
            text: "ここから全体の施工手順に戻ります。",
            variant: "return",
          },
          { id: "hole-step-7", type: "step", number: "7", title: "全体にサビ止め塗布", note: "", variant: "finish" },
          { id: "hole-step-8", type: "step", number: "8", title: "中塗り・上塗り", note: "", variant: "finish" },
        ],
      },
    },
    {
      id: "free",
      name: "自由作成",
      diagram: {
        title: "工程図解",
        description: "",
        items: [],
      },
    },
  ];
  const fieldPlaceholders = {
    お客様名: "例：山田 太郎 様",
    工事名: "例：山田様邸 屋根塗装改修工事",
    現場住所: "例：岡山市北区○○",
    担当者: "例：小林 晋",
    天気: "例：晴れ",
    "調査日時（日付）": "例：2026/06/24",
    調査目的: "例：外壁と屋根まわりの状態確認",
    "お客様のご不安・ご相談内容":
      "お客様が気にされていることや、ご希望を書いてください。\n例：雨漏りはしていないが、サビが出ているため今後が心配。\n箇条書きでもOKです。AIが自然な文章へ整えます。",
    全体のまとめ:
      "今回の調査結果とおすすめの方向性をまとめてください。\nお客様が「結局どう考えればよいか」が分かる内容にすると伝わりやすくなります。",
    確認した内容:
      "見たままをできるだけ詳しく書いてください。\n箇条書きでもOKです。\n例：床面に濡れあり、タイルの浮き・割れあり、端部にサビあり。",
    "考えられること・注意点":
      "このままにした場合の心配点を書いてください。\n断定できない場合は「可能性があります」でOKです。\n例：雨天時に滑りやすくなる可能性があります。",
    対応の考え方:
      "まず何を確認し、どのような対応を検討するかを書いてください。\n箇条書きでもOKです。\n例：浮きや割れの範囲を確認し、必要に応じて補修を検討します。",
    撮影箇所: "例：西面外壁／キッチン流し台／リビング天井",
    確認項目名: "例：屋根／外壁／室内現状回復／キッチン流し台／階段踏面",
    この箇所の対応目安:
      "どう直したいか、どんな対応がよさそうかを書いてください。箇条書きでもOKです。\n例：雨漏れの原因を確認し、必要に応じて補修を行うことをおすすめします。",
    総合目安:
      "今回の確認結果をもとに、全体としてどのような状態かを書いてください。\n例：塗替えと補修を検討する時期です。",
    緊急性について:
      "今すぐ対応が必要か、早めの検討でよいかを書いてください。\n不安をあおらず、判断しやすい表現を意識してください。",
    おすすめの方向性:
      "ここは受注につながる大切な欄です。\n確認結果をもとに、どのような対応をおすすめするのかを書いてください。\n箇条書きでもOKです。AIが文章を整えます。",
    表示文: "例：環境影響あり",
    写真タイトル: "例：屋根全体の色あせ",
    現在の状態:
      "見たまま・気づいたことを、できるだけ具体的に書いてください。箇条書きでもOKです。\n例：雨漏れの跡あり。外壁の浮きあり。鉄部にサビが出ている。",
    ご提案内容:
      "今回おすすめする工事内容を短く書いてください。\n例：外部階段の滑り対策を中心にした改修提案",
    おすすめする施工方針:
      "ここは受注につながる大切な欄です。\n確認結果をもとに、なぜこの対応をおすすめするのかを書いてください。\n箇条書きでもOKです。AIが読みやすい文章へ整えます。",
    主な工事内容:
      "今回の工事で行う主な内容を書いてください。\nどこを、どのように対応するのかを具体的に書くと、お客様に伝わりやすくなります。",
    "4. あわせておすすめしたい対策":
      "ここは受注につながる大切な欄です。\n現地を見て気づいた不安点や、今後困りそうなことがあれば、専門家の視点で入力してください。\n無理な追加提案ではなく、お客様に役立つ内容を分かる範囲で書いてください。",
    "5. 工事中に確認が必要なこと":
      "ここは「聞いていない」を防ぐ大切な欄です。\n足場設置後や作業中に追加確認が必要になりそうな点を書いてください。\n分かる範囲でOKです。",
    今後注意しておきたい点:
      "工事後も気をつけておきたいことを書いてください。\n今すぐ問題でなくても、今後変化が出そうな点があれば入力してください。",
    最後にお伝えしたいこと:
      "お客様が安心して判断できるよう、最後に伝えたいことを書いてください。\n無理な売り込みではなく、相談しやすさや確認の姿勢が伝わる内容がおすすめです。",
  };

  const defaultState = {
    company: {
      name: "",
      brandName: "",
      contactPerson: "",
      postalCode: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      services: "",
      tagline: "",
      logoDataUrl: "",
      logoName: "",
      logo2DataUrl: "",
      logo2Name: "",
      companyInfoChangedAt: "",
      contact: "",
    },
    project: {
      title: "建物調査報告書",
      clientName: "山田 太郎 様",
      workName: "岡山市北区 ご自宅",
      address: "岡山市北区○○",
      surveyDate: today,
      surveyTime: "09:00",
      inspector: "小林 晋",
      weather: "晴れ",
      buildingType: "戸建て",
      projectType: "外壁塗装",
      purpose: "外壁と屋根まわりの状態確認",
    },
    summary: {
      overall: "確認した範囲では、外壁の一部に色あせと細かなひびが見られます。すぐに大きな問題になるとは限りませんが、今後の傷みを抑えるために早めの対処を検討しておくと安心です。",
      customerConcern: "雨漏りや外壁の傷みが進まないか心配されていました。",
      recommendation: "現時点では、外壁塗装とシーリング（目地の防水材）まわりの補修を中心に検討する内容が分かりやすいと考えられます。",
      additionalRecommendations: "遮熱塗料の使用や雨樋の落ち葉除けカバーなど、今後のメンテナンス負担を減らす対策もあわせて検討できます。",
      estimateNote: "",
    },
    findings: [
      {
        id: createId(),
        area: "外壁",
        condition: "劣化・不具合が見られる",
        priority: "high",
        observation: "南面の外壁に色あせと細かなひびが見られました。",
        concern: "状態によっては、雨水が入りやすくなったり、塗膜の傷みが進む可能性があります。",
        proposal: "ひびの状態を確認し、必要に応じて補修したうえで塗装する方法が考えられます。",
      },
      {
        id: createId(),
        area: "シーリング（目地の防水材）",
        condition: "軽微な劣化",
        priority: "medium",
        observation: "窓まわりのシーリング（目地の防水材）に硬化と細かなすき間が見られました。",
        concern: "今後すき間が広がると、雨水が入り込む原因になる可能性があります。",
        proposal: "既存状態を確認し、打ち替えまたは補修の範囲を整理します。",
      },
    ],
    photos: [],
    proposal: {
      planName: "外壁・シーリングまわりを中心にしたご提案",
      scope: "外壁の下地処理、ひび補修、シーリング（目地の防水材）まわりの確認、必要箇所の塗装を中心に検討します。",
      cautions: "写真と目視で確認した範囲のため、足場設置後や高所確認時に追加で分かる点が出る可能性があります。",
      totalOpinion: "確認した範囲では、外壁とシーリングまわりを中心に今後のメンテナンスを検討しておくと安心です。",
      recommendedNow: "今回おすすめする対応は、傷みが見られる箇所の補修範囲を整理し、必要な工事内容と金額の理由が分かる見積りを作成することです。",
      watchPoint: "今すぐ工事が必要と断定するものではありませんが、ひび・すき間・雨染みなどは今後の状態によって傷みが進む可能性があります。",
      closing: "不要な工事を無理におすすめするものではありません。気になる点があれば、分かる範囲で一つずつご説明いたします。",
    },
    processDiagram: {
      enabled: false,
      templateId: "holeRepair",
      ...cloneProcessDiagramTemplate("holeRepair"),
    },
    assessment: {
      items: [
        { id: "urgency", label: "緊急性", value: 2, displayText: "今後の経過確認をおすすめします。", memo: "" },
        { id: "safety", label: "安全性", value: 3, displayText: "現時点で大きな危険は見られません。", memo: "" },
        { id: "usageImpact", label: "使用上の支障", value: 4, displayText: "現在の使用に大きな支障はありません。", memo: "" },
        { id: "deterioration", label: "劣化・損傷の程度", value: 4, displayText: "経年による劣化が見られます。", memo: "" },
        { id: "buildingImpact", label: "建物への影響", value: 5, displayText: "必要に応じて詳しい確認が必要です。", memo: "" },
        {
          id: "maintenanceAttention",
          label: "維持管理上の注意度",
          value: 4,
          displayText: "今後も定期的な確認をおすすめします。",
          memo: "",
        },
      ],
      overall: "状態に応じて確認・補修を検討する時期です。",
      urgency: "現時点で緊急性は高くありませんが、今後の経過確認をおすすめします。",
      policy: "必要箇所を詳しく確認し、状態に応じた補修・対策を検討することをおすすめします。",
    },
  };
  const sampleState = clone(defaultState);
  blankExampleValues(defaultState);

  let state = clone(defaultState);
  let toastTimer = null;
  let storageWarningShown = false;
  let externalDirty = false;
  let saveStatus = {
    label: "読み込み中",
    detail: "",
    failed: false,
  };
  let currentDirectoryHandle = null;
  let currentReportName = "未保存の報告書";
  let currentLocationLabel = "保存先はまだ決まっていません";
  let startScreenVisible = true;
  let activeInputSectionId = inputSectionNavigation[0].id;
  let sectionNavigationScrollHandler = null;
  let sectionNavigationResizeHandler = null;
  let sectionNavigationFrame = 0;
  let companyInfoChangePending = false;
  const app = document.getElementById("app");

  bootstrap();

  async function bootstrap() {
    state = loadState();
    const savedCompanySettings = loadCompanySettings();
    if (savedCompanySettings && !hasCompanyInformation(state.company)) {
      state.company = savedCompanySettings;
    }
    currentReportName = inferReportName(state);
    currentLocationLabel = "前回の一時保存";
    const savedDirectory = await restoreCurrentDirectoryHandle();
    if (savedDirectory) applyRestoredDirectoryHandle(savedDirectory);
    await migrateEmbeddedPhotosToIndexedDB(state);
    await hydratePhotoSources(state);
    saveState({ allowDestructive: true, markDirty: false, silent: true });
    const permissionStatus = currentDirectoryHandle ? await queryDirectoryPermission(currentDirectoryHandle, "readwrite") : "";
    setSaveStatus(
      "保存済み",
      permissionStatus && permissionStatus !== "granted"
        ? "上書き保存時に保存先フォルダへの再許可が必要です"
        : `最終保存：${formatTime(new Date())}`,
    );
    render();
    window.addEventListener("beforeunload", handleBeforeUnload);
  }

  function render() {
    syncPrintFooterStyle();
    app.innerHTML = "";
    app.className = "app";
    app.appendChild(renderHeader());

    const shell = el("main", { className: "shell" });
    shell.appendChild(renderEditor());
    shell.appendChild(renderPreview());
    app.appendChild(shell);
    if (startScreenVisible) app.appendChild(renderStartScreen());
    setupInputSectionNavigation();
    scheduleAutoResizeTextareas();
  }

  function renderHeader() {
    return el("header", { className: "app-header" }, [
      el("div", { className: "brand" }, [
        el("div", { className: "brand-mark", text: "報" }),
        el("div", {}, [
          el("h1", { text: "建物調査報告書メーカー" }),
          el("p", { text: "写真・状態・提案を、お客様に伝わる報告書へ" }),
        ]),
      ]),
      el("div", { className: "header-actions" }, [
        renderSaveStatus(),
        button("見本を入れる", "btn", loadSample),
        button("入力チェック", "btn", () => showInputCheckDialog()),
        button("名前を付けて保存", "btn", saveDataAs),
        button("上書き保存", "btn warn", saveCurrentReport),
        button("印刷 / PDF", "btn primary", requestPrint),
      ]),
    ]);
  }

  function renderSaveStatus() {
    return el("div", { id: "save-status", className: `save-status ${saveStatus.failed ? "failed" : ""}`.trim() }, [
      el("span", { text: `現在の報告書：${currentReportName}` }),
      el("span", { text: `保存先：${currentLocationLabel}` }),
      el("strong", { text: saveStatus.label }),
      saveStatus.detail ? el("span", { text: saveStatus.detail }) : "",
    ]);
  }

  function renderStartScreen() {
    return el("div", { className: "start-screen" }, [
      el("div", { className: "start-dialog" }, [
        el("h2", { text: "建物調査報告書メーカー" }),
        el("p", { text: "作業を始める方法を選んでください。" }),
        el("div", { className: "start-actions" }, [
          button("新規作成", "btn primary", newReport),
          button("保存した報告書を開く", "btn", openSavedData),
          button("前回の続きから再開", "btn warn", () => {
            startScreenVisible = false;
            render();
          }),
        ]),
      ]),
    ]);
  }

  function renderEditor() {
    const stack = el("section", { className: "panel-stack" });
    stack.appendChild(renderInputSectionNavigation());
    appendInputSection(stack, renderProjectPanel(), "section-project");
    appendInputSection(stack, renderConcernPanel(), "section-concern");
    appendInputSection(stack, renderFindingsPanel(), "section-findings");
    appendInputSection(stack, renderPhotosPanel(), "section-photos");
    appendInputSection(stack, renderAssessmentPanel(), "section-assessment");
    appendInputSection(stack, renderProposalPanel(), "section-proposal");
    appendInputSection(stack, renderSummaryPanel(), "section-summary");
    appendInputSection(stack, renderQualityPanel(), "section-quality");
    appendInputSection(stack, renderDataPanel(), "section-data");
    appendInputSection(stack, renderCompanyPanel(), "section-company");
    return stack;
  }

  function renderInputSectionNavigation() {
    return el("nav", { className: "input-section-nav", "aria-label": "入力セクション" }, [
      el("div", { className: "input-section-nav-label", text: "入力項目へ移動" }),
      el(
        "div",
        { className: "input-section-nav-buttons" },
        inputSectionNavigation.map((section) =>
          el("button", {
            type: "button",
            className: `section-nav-button ${section.id === activeInputSectionId ? "active" : ""}`.trim(),
            text: section.label,
            "data-section-target": section.id,
            "aria-current": section.id === activeInputSectionId ? "true" : "false",
            onclick: () => scrollToInputSection(section.id),
          }),
        ),
      ),
    ]);
  }

  function appendInputSection(stack, section, id) {
    section.id = id;
    section.classList.add("input-section");
    stack.appendChild(section);
  }

  function scrollToInputSection(sectionId) {
    const target = document.getElementById(sectionId);
    if (!target) return;
    activeInputSectionId = sectionId;
    updateInputSectionNavigation(sectionId);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setupInputSectionNavigation() {
    if (sectionNavigationScrollHandler) {
      window.removeEventListener("scroll", sectionNavigationScrollHandler);
      sectionNavigationScrollHandler = null;
    }
    if (sectionNavigationResizeHandler) {
      window.removeEventListener("resize", sectionNavigationResizeHandler);
      sectionNavigationResizeHandler = null;
    }
    if (sectionNavigationFrame) {
      window.cancelAnimationFrame(sectionNavigationFrame);
      sectionNavigationFrame = 0;
    }

    const navigation = document.querySelector(".input-section-nav");
    const sections = inputSectionNavigation.map((section) => document.getElementById(section.id)).filter(Boolean);
    if (!navigation || !sections.length) return;

    const syncMeasurements = () => {
      const headerHeight = document.querySelector(".app-header")?.getBoundingClientRect().height || 0;
      const navigationHeight = navigation.getBoundingClientRect().height || 0;
      document.documentElement.style.setProperty("--app-header-height", `${Math.ceil(headerHeight)}px`);
      document.documentElement.style.setProperty("--input-section-nav-height", `${Math.ceil(navigationHeight)}px`);
    };

    const updateFromScroll = () => {
      sectionNavigationFrame = 0;
      syncMeasurements();
      const headerHeight = document.querySelector(".app-header")?.getBoundingClientRect().height || 0;
      const navigationHeight = navigation.getBoundingClientRect().height || 0;
      const activationLine = headerHeight + navigationHeight + 24;
      let current = sections[0];

      sections.forEach((section) => {
        if (section.getBoundingClientRect().top <= activationLine) current = section;
      });
      const lastSection = sections[sections.length - 1];
      const lastSectionRect = lastSection.getBoundingClientRect();
      const lastSectionIsVisible =
        lastSectionRect.top < window.innerHeight * 0.78 &&
        lastSectionRect.bottom > activationLine;
      if (
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4 ||
        lastSectionIsVisible
      ) {
        current = lastSection;
      }
      if (current.id !== activeInputSectionId) {
        activeInputSectionId = current.id;
        updateInputSectionNavigation(current.id);
      }
    };

    sectionNavigationScrollHandler = () => {
      if (sectionNavigationFrame) return;
      sectionNavigationFrame = window.requestAnimationFrame(updateFromScroll);
    };
    sectionNavigationResizeHandler = () => {
      syncMeasurements();
      sectionNavigationScrollHandler();
    };
    window.addEventListener("scroll", sectionNavigationScrollHandler, { passive: true });
    window.addEventListener("resize", sectionNavigationResizeHandler);
    syncMeasurements();
    updateFromScroll();
  }

  function updateInputSectionNavigation(sectionId) {
    let activeButton = null;
    document.querySelectorAll(".section-nav-button").forEach((buttonNode) => {
      const active = buttonNode.dataset.sectionTarget === sectionId;
      buttonNode.classList.toggle("active", active);
      buttonNode.setAttribute("aria-current", active ? "true" : "false");
      if (active) activeButton = buttonNode;
    });
    if (!activeButton) return;
    const buttonRow = activeButton.closest(".input-section-nav-buttons");
    if (!buttonRow || buttonRow.scrollWidth <= buttonRow.clientWidth) return;
    const targetLeft = activeButton.offsetLeft - (buttonRow.clientWidth - activeButton.offsetWidth) / 2;
    buttonRow.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
  }

  function renderProjectPanel() {
    return panel("基本情報", [
      el("div", { className: "form-grid" }, [
        inputField("お客様名", state.project.clientName, (v) => update("project.clientName", v), "", "text", undefined, textLimit("projectClientName")),
        inputField("工事名", state.project.workName, (v) => update("project.workName", v), "", "text", undefined, textLimit("projectWorkName")),
        inputField("現場住所", state.project.address, (v) => update("project.address", v), "full", "text", undefined, textLimit("projectAddress")),
        inputField("調査日時（日付）", state.project.surveyDate, (v) => update("project.surveyDate", v), "", "date"),
        selectField("調査日時（時刻）", state.project.surveyTime, surveyTimeOptions, (v) => update("project.surveyTime", v)),
        inputField("担当者", state.project.inspector, (v) => update("project.inspector", v)),
        selectFieldWithOther("建物種別", state.project.buildingType, buildingTypeOptions, (v) => update("project.buildingType", v), undefined, textLimit("projectBuildingTypeOther")),
        selectFieldWithOther("相談内容", state.project.projectType, projectOptions, (v) => update("project.projectType", v), undefined, textLimit("projectTypeOther")),
        inputField("天気", state.project.weather, (v) => update("project.weather", v), "", "text", undefined, textLimit("projectWeather")),
        inputField("調査目的", state.project.purpose, (v) => update("project.purpose", v), "full", "text", undefined, textLimit("projectPurpose")),
      ]),
    ]);
  }

  function renderConcernPanel() {
    return panel("1. お客様のご不安・ご相談内容", [
      el("div", { className: "form-grid" }, [
        textareaField("お客様のご不安・ご相談内容", state.summary.customerConcern, (v) => update("summary.customerConcern", v), "full", undefined, textLimit("customerConcern")),
      ]),
    ], button("ご相談内容をAIで整える", "btn small section-ai-button", () => copyReportSectionAiPrompt("concern")));
  }

  function renderSummaryPanel() {
    return panel("6. 全体まとめ", [
      el("div", { className: "summary-strip" }, [
        metric("確認項目", `${state.findings.length}件`),
        metric("早めに対処", `${state.findings.filter((item) => ["high", "urgent"].includes(item.priority)).length}件`),
        metric("写真", `${state.photos.length}枚`),
      ]),
      el("div", { className: "form-grid", style: "margin-top:12px" }, [
        textareaField("全体のまとめ", state.summary.overall, (v) => update("summary.overall", v), "full", undefined, textLimit("summaryOverall")),
      ]),
    ], el("div", { className: "panel-action-row" }, [
      button("全体のまとめをAIで整える", "btn small section-ai-button", () => copyReportSectionAiPrompt("summary")),
      button("AI回答を貼り戻す", "btn small", () => openAiReplyImportDialog("summary")),
    ]));
  }

  function renderFindingsPanel() {
    const body = el("div", { className: "finding-list" });
    state.findings.forEach((finding, index) => body.appendChild(renderFindingCard(finding, index)));
    if (!state.findings.length) {
      body.appendChild(el("div", { className: "empty", text: "確認項目を追加してください" }));
    }

    return panel(
      "2. 調査写真・確認項目ごとの確認結果",
      [
        el("div", { className: "findings-section-guide" }, [
          el("p", { text: "現地で確認した内容を、箇所ごとに整理する欄です。" }),
          el("p", {
            text:
              "写真は「見た目」を伝えるため、確認項目は「担当者の見立て・注意点・対応の考え方」を伝えるために使います。",
          }),
          el("p", { text: "見たままを箇条書きで入力してもOKです。AIが文章を整えます。" }),
          el("div", { className: "findings-section-examples" }, [
            el("span", { text: "入力例" }),
            el("ul", {}, [
              el("li", { text: "屋根全体にサビがある" }),
              el("li", { text: "外壁にひび割れがある" }),
              el("li", { text: "雨樋に落ち葉が詰まっている" }),
              el("li", { text: "階段が雨の日に滑りやすい" }),
            ]),
          ]),
        ]),
        body,
      ],
      button("確認項目を追加", "btn primary small", () => {
        state.findings.push({
          id: createId(),
          area: "",
          condition: "",
          priority: "",
          observation: "",
          concern: "",
          proposal: "",
        });
        saveState();
        render();
      }),
    );
  }

  function renderFindingCard(finding, index) {
    return el("article", { className: "finding-card" }, [
      el("div", { className: "finding-card-header" }, [
        el("div", { className: "finding-title" }, [
          inputField(
            "確認項目名",
            finding.area,
            (v) => patchFinding(finding.id, "area", v),
            "",
            "text",
            "例：屋根／外壁／室内現状回復／キッチン流し台／階段踏面",
            textLimit("findingAreaOther"),
          ),
          priorityBadge(finding.priority),
        ]),
        el("div", { className: "mini-actions" }, [
          button("AIで文章を整える", "btn small", () => copyFindingAiConsultationPrompt(finding.id)),
          button("AI回答を貼り戻す", "btn small", () => openAiReplyImportDialog("finding", finding.id)),
          button("上へ", "btn small", () => moveItem("findings", index, -1), index === 0),
          button("下へ", "btn small", () => moveItem("findings", index, 1), index === state.findings.length - 1),
          button("削除", "btn danger small", () => {
            state.findings = state.findings.filter((item) => item.id !== finding.id);
            state.photos.forEach((photo) => {
              if (photo.findingId === finding.id) photo.findingId = "";
            });
            saveState();
            render();
          }),
        ]),
      ]),
      el("div", { className: "finding-card-body" }, [
        el("div", { className: "form-grid" }, [
          selectField("状態", finding.condition, conditionOptions, (v) => patchFinding(finding.id, "condition", v)),
          selectField("対応の目安", finding.priority, priorities.map((item) => item.value), (v) => patchFinding(finding.id, "priority", v), priorityLabel),
          textareaField("確認した内容", finding.observation, (v) => patchFinding(finding.id, "observation", v), "full", undefined, textLimit("findingObservation")),
          textareaField("考えられること・注意点", finding.concern, (v) => patchFinding(finding.id, "concern", v), "full", undefined, textLimit("findingConcern")),
          textareaField("対応の考え方", finding.proposal, (v) => patchFinding(finding.id, "proposal", v), "full", undefined, textLimit("findingProposal")),
        ]),
        renderFindingRelatedPhotos(finding),
      ]),
    ]);
  }

  function renderFindingRelatedPhotos(finding) {
    const relatedPhotos = state.photos.filter((photo) => photo.findingId === finding.id);
    return el("div", { className: "finding-related-photos" }, [
      el("div", { className: "finding-related-photos-header" }, [
        el("strong", { text: "関連写真" }),
        relatedPhotos.length ? el("span", { text: `${relatedPhotos.length}枚` }) : "",
      ]),
      relatedPhotos.length
        ? el(
            "div",
            { className: "finding-related-photo-list" },
            relatedPhotos.map((photo) => renderFindingRelatedPhotoItem(photo)),
          )
        : el("p", { className: "finding-related-photo-empty", text: "この確認項目に紐づく写真はまだありません。" }),
    ]);
  }

  function renderFindingRelatedPhotoItem(photo) {
    return el("div", { className: "finding-related-photo-item" }, [
      photo.src
        ? renderAnnotatedImage(photo, "finding-related-photo-thumb", photo.title || photo.area || "関連写真", "cover")
        : el("div", { className: "finding-related-photo-thumb finding-related-photo-missing", text: "写真" }),
      el("div", { className: "finding-related-photo-copy" }, [
        el("strong", { text: photo.title || photo.area || "写真タイトル未入力" }),
        photo.area ? el("span", { text: photo.area }) : "",
        photo.condition ? el("em", { text: photo.condition }) : "",
      ]),
    ]);
  }

  function renderPhotosPanel() {
    let dragDepth = 0;
    const resetDropState = (dropArea) => {
      dragDepth = 0;
      dropArea.classList.remove("drag-over");
    };
    const photoDrop = el("label", {
      className: "photo-drop",
      ondragenter: (event) => {
        event.preventDefault();
        dragDepth += 1;
        event.currentTarget.classList.add("drag-over");
      },
      ondragover: (event) => {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
        event.currentTarget.classList.add("drag-over");
      },
      ondragleave: (event) => {
        event.preventDefault();
        dragDepth = Math.max(0, dragDepth - 1);
        if (dragDepth === 0) event.currentTarget.classList.remove("drag-over");
      },
      ondrop: (event) => {
        event.preventDefault();
        event.stopPropagation();
        resetDropState(event.currentTarget);
        const droppedFiles = Array.from(event.dataTransfer?.files || []);
        const imageFiles = droppedFiles.filter((file) => file.type.startsWith("image/"));
        if (imageFiles.length) handlePhotos(imageFiles);
        if (droppedFiles.length > imageFiles.length) {
          showToast("画像ファイルのみ追加できます。画像以外のファイルは除外しました。");
        }
      },
      ondragend: (event) => resetDropState(event.currentTarget),
    }, [
      el("input", {
        type: "file",
        accept: "image/*",
        multiple: true,
        onchange: (event) => {
          const files = Array.from(event.target.files || []);
          event.target.value = "";
          handlePhotos(files);
        },
      }),
      el("div", { className: "photo-drop-copy" }, [
        el("strong", { text: "現場写真を追加" }),
        el("span", { text: "クリックして選択、または写真をここへドラッグ＆ドロップ" }),
      ]),
    ]);
    const body = el("div", {}, [
      photoDrop,
    ]);

    const list = el("div", { className: "photo-list", style: "margin-top:12px" });
    state.photos.forEach((photo, index) => list.appendChild(renderPhotoCard(photo, index)));
    if (!state.photos.length) {
      list.appendChild(el("div", { className: "empty", text: "写真を入れると報告書の信頼感が上がります" }));
    }
    body.appendChild(list);
    return panel("調査写真", [body]);
  }

  function renderAssessmentPanel() {
    return panel("今回の確認結果にもとづく目安", [
      el("div", { className: "assessment-editor" }, [
        el("p", {
          className: "assessment-input-note",
          text: "この欄はPDFの要約ページに表示されます。文字数が多いと、PDFで文字が重なる場合があります。目安文字数内で、短く要点をまとめてください。",
        }),
        ...state.assessment.items.map((item) => assessmentItemField(item)),
        countedTextField(
          "総合目安",
          state.assessment.overall,
          (v) => update("assessment.overall", v),
          textLimit("assessmentOverall"),
          "full",
          true,
        ),
        countedTextField(
          "緊急性について",
          state.assessment.urgency,
          (v) => update("assessment.urgency", v),
          textLimit("assessmentUrgency"),
          "full",
          true,
        ),
        countedTextField(
          "おすすめの方向性",
          state.assessment.policy,
          (v) => update("assessment.policy", v),
          textLimit("assessmentPolicy"),
          "full",
          true,
        ),
      ]),
    ], el("div", { className: "panel-action-row" }, [
      button("目安の文章をAIで整える", "btn small section-ai-button", () => copyReportSectionAiPrompt("assessment")),
      button("AI回答を貼り戻す", "btn small", () => openAiReplyImportDialog("assessment")),
    ]));
  }

  function assessmentItemField(item) {
    return el("div", { className: "assessment-item-field" }, [
      selectField(`程度：${item.label}`, item.value == null ? "" : String(item.value), ["1", "2", "3", "4", "5"], (v) => patchAssessmentItem(item.id, v), (v) => `目安${v}`),
    ]);
  }

  function renderPhotoCard(photo, index) {
    const findingText = photo.finding || photo.memo || "";
    return el("article", { className: "photo-card" }, [
      el("div", { className: "photo-form" }, [
        el("div", { className: "thumb-wrap" }, [
          photo.src
            ? renderAnnotatedImage(photo, "photo-thumb", photo.title || "現場写真", "cover")
            : el("div", { className: "photo-missing thumb-missing", text: "写真なし" }),
          photo.src
            ? el("div", { className: "photo-thumb-tools" }, [
                button("写真に印をつける", "btn annotation-edit-button", () => openPhotoAnnotationEditor(photo.id)),
                button("AI相談画像", "btn ai-consultation-image-button", () => createAiConsultationImage(photo.id)),
              ])
            : "",
        ]),
        el("div", { className: "photo-card-body" }, [
          el("div", { className: "mini-actions" }, [
            photo.src ? button("相談文をコピー", "btn small", () => copyAiConsultationPrompt(photo.id)) : "",
            photo.src ? button("AI回答を貼り戻す", "btn small", () => openAiReplyImportDialog("photo", photo.id)) : "",
            button("上へ", "btn small", () => moveItem("photos", index, -1), index === 0),
            button("下へ", "btn small", () => moveItem("photos", index, 1), index === state.photos.length - 1),
            button("削除", "btn danger small", () => {
              deletePhotoBlob(photo.photoId || photo.id);
              state.photos = state.photos.filter((item) => item.id !== photo.id);
              saveState();
              render();
            }),
          ]),
          photo.src ? el("p", { className: "ai-consultation-notice", text: AI_REVIEW_NOTICE }) : "",
          el("div", { className: "form-grid" }, [
            inputField("写真タイトル", photo.title, (v) => patchPhoto(photo.id, "title", v), "", "text", undefined, textLimit("photoTitle")),
            photoFindingField(photo),
            inputField("撮影箇所", photo.area, (v) => patchPhoto(photo.id, "area", v), "", "text", "例：西面外壁／キッチン流し台／リビング天井", textLimit("photoAreaOther")),
            selectFieldWithOther("調査結果の目安", photo.condition || "", conditionOptions, (v) => patchPhoto(photo.id, "condition", v), undefined, textLimit("photoConditionOther")),
            textareaField("現在の状態", findingText, (v) => patchPhoto(photo.id, "finding", v), "full", undefined, textLimit("photoFinding")),
            textareaField("この箇所の対応目安", photo.recommendation, (v) => patchPhoto(photo.id, "recommendation", v), "full", undefined, textLimit("photoRecommendation")),
          ]),
        ]),
      ]),
    ]);
  }

  function photoFindingField(photo) {
    const options = state.findings
      .filter((finding) => finding && finding.id)
      .map((finding, index) => ({
        id: finding.id,
        label: safeText(finding.area).trim() || `確認項目${index + 1}`,
      }));
    const selectedId = options.some((option) => option.id === photo.findingId) ? photo.findingId : "";
    return el("div", { className: "field" }, [
      el("label", { text: "所属する確認項目" }),
      el(
        "select",
        {
          value: selectedId,
          className: selectedId ? "" : "is-empty",
          onchange: (event) => {
            patchPhoto(photo.id, "findingId", event.target.value);
            render();
          },
        },
        [
          el("option", { value: "", text: "未分類" }),
          ...options.map((option) => el("option", { value: option.id, text: option.label })),
        ],
      ),
    ]);
  }

  function renderProposalPanel() {
    return panel("3. おすすめする施工方針", [
      el("div", { className: "form-grid" }, [
        inputField("ご提案内容", state.proposal.planName, (v) => update("proposal.planName", v), "full", "text", undefined, textLimit("proposalPlanName")),
        textareaField("おすすめする施工方針", state.summary.recommendation, (v) => update("summary.recommendation", v), "full important-input", undefined, textLimit("proposalRecommendation")),
        textareaField("主な工事内容", state.proposal.scope, (v) => update("proposal.scope", v), "full important-input", undefined, textLimit("proposalScope")),
        textareaField("4. あわせておすすめしたい対策", state.summary.additionalRecommendations, (v) => update("summary.additionalRecommendations", v), "full important-input", undefined, textLimit("proposalAdditional")),
        textareaField("5. 工事中に確認が必要なこと", state.proposal.cautions, (v) => update("proposal.cautions", v), "full", undefined, textLimit("proposalCautions")),
        textareaField("今後注意しておきたい点", state.proposal.watchPoint, (v) => update("proposal.watchPoint", v), "full", undefined, textLimit("proposalWatchPoint")),
        textareaField("最後にお伝えしたいこと", state.proposal.closing, (v) => update("proposal.closing", v), "full", undefined, textLimit("proposalClosing")),
      ]),
      renderProcessDiagramEditor(),
    ], el("div", { className: "panel-action-row" }, [
      button("施工方針の文章をAIで整える", "btn small proposal-ai-button", copyProposalAiConsultationPrompt),
      button("AI回答を貼り戻す", "btn small", () => openAiReplyImportDialog("proposal")),
    ]));
  }

  function renderAnnotatedImage(photo, imageClassName, alt, fit = "cover") {
    const image = el("img", {
      className: imageClassName,
      src: photo.src,
      alt,
    });
    const overlay = svgEl("svg", {
      className: "photo-annotation-overlay",
      "aria-hidden": "true",
      preserveAspectRatio: fit === "contain" ? "xMidYMid meet" : "xMidYMid slice",
    });
    const wrapper = el("div", { className: `annotated-photo-image annotation-fit-${fit}` }, [image, overlay]);

    const syncOverlay = () => {
      const width = image.naturalWidth || 1000;
      const height = image.naturalHeight || 1000;
      overlay.setAttribute("viewBox", `0 0 ${width} ${height}`);
      drawAnnotationShapes(overlay, photo.annotations, width, height);
    };
    image.addEventListener("load", syncOverlay);
    if (image.complete) window.requestAnimationFrame(syncOverlay);
    return wrapper;
  }

  function drawAnnotationShapes(svg, annotations, width, height, options = {}) {
    svg.replaceChildren();
    const list = normalizeAnnotations(annotations);
    list.forEach((annotation) => {
      const group = createAnnotationShape(annotation, width, height, options);
      if (group) svg.appendChild(group);
    });
  }

  function createAnnotationShape(annotation, width, height, options = {}) {
    const scale = Math.max(0.25, Math.min(width, height) / 1000);
    const redWidth = Number(annotation.strokeWidth) || 8;
    const outlineWidth = Math.max(redWidth + 4, Number(annotation.outlineWidth) || 14);
    const strokeColor = annotation.strokeColor || "#c5222d";
    const outlineColor = annotation.outlineColor || "#ffffff";
    const group = svgEl("g", { className: `photo-annotation-shape annotation-${annotation.type}` });
    const select = options.onSelect;
    const interactive = typeof select === "function";
    if (interactive) {
      group.addEventListener("pointerdown", (event) => select(event, annotation.id, "move"));
    }

    if (annotation.type === "circle") {
      const cx = annotation.cx * width;
      const cy = annotation.cy * height;
      const rx = Math.max(2, annotation.rx * width);
      const ry = Math.max(2, annotation.ry * height);
      group.append(
        svgEl("ellipse", {
          cx,
          cy,
          rx,
          ry,
          fill: "none",
          stroke: outlineColor,
          "stroke-width": outlineWidth,
          "vector-effect": "non-scaling-stroke",
        }),
        svgEl("ellipse", {
          cx,
          cy,
          rx,
          ry,
          fill: "none",
          stroke: strokeColor,
          "stroke-width": redWidth,
          "stroke-linecap": "round",
          "vector-effect": "non-scaling-stroke",
        }),
      );
      if (interactive) {
        const hit = svgEl("ellipse", {
          cx,
          cy,
          rx,
          ry,
          fill: "none",
          stroke: "transparent",
          "stroke-width": Math.max(24, outlineWidth + 12),
          "pointer-events": "stroke",
        });
        group.appendChild(hit);
      }
    }

    if (annotation.type === "arrow") {
      const x1 = annotation.x1 * width;
      const y1 = annotation.y1 * height;
      const x2 = annotation.x2 * width;
      const y2 = annotation.y2 * height;
      const headSize = (Number(annotation.arrowHeadSize) || 40) * scale * 1.2;
      const outlineHeadSize = headSize + 6 * scale;
      const outlineHead = arrowHeadPoints(x1, y1, x2, y2, outlineHeadSize);
      const redHead = arrowHeadPoints(x1, y1, x2, y2, headSize);
      const outlineShaftEnd = arrowShaftEnd(x1, y1, x2, y2, outlineHeadSize);
      const redShaftEnd = arrowShaftEnd(x1, y1, x2, y2, headSize);
      group.append(
        svgEl("line", {
          x1,
          y1,
          x2: outlineShaftEnd.x,
          y2: outlineShaftEnd.y,
          stroke: outlineColor,
          "stroke-width": outlineWidth,
          "stroke-linecap": "round",
          "vector-effect": "non-scaling-stroke",
        }),
        svgEl("polygon", { points: outlineHead, fill: outlineColor }),
        svgEl("line", {
          x1,
          y1,
          x2: redShaftEnd.x,
          y2: redShaftEnd.y,
          stroke: strokeColor,
          "stroke-width": redWidth,
          "stroke-linecap": "round",
          "vector-effect": "non-scaling-stroke",
        }),
        svgEl("polygon", { points: redHead, fill: strokeColor }),
      );
      if (interactive) {
        const hit = svgEl("line", {
          x1,
          y1,
          x2,
          y2,
          stroke: "transparent",
          "stroke-width": Math.max(26, outlineWidth + 12),
          "stroke-linecap": "round",
          "pointer-events": "stroke",
        });
        group.appendChild(hit);
      }
    }
    return group;
  }

  function arrowHeadPoints(x1, y1, x2, y2, size) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const baseX = x2 - ux * size;
    const baseY = y2 - uy * size;
    const halfWidth = size * 0.42;
    return `${x2},${y2} ${baseX - uy * halfWidth},${baseY + ux * halfWidth} ${baseX + uy * halfWidth},${baseY - ux * halfWidth}`;
  }

  function arrowShaftEnd(x1, y1, x2, y2, headSize) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy) || 1;
    const overlap = headSize * 0.72;
    return {
      x: x2 - (dx / length) * overlap,
      y: y2 - (dy / length) * overlap,
    };
  }

  function openPhotoAnnotationEditor(photoId) {
    const photo = state.photos.find((item) => item.id === photoId);
    if (!photo || !photo.src) return;

    let draft = clone(normalizeAnnotations(photo.annotations));
    const initialAnnotations = JSON.stringify(draft);
    let history = [];
    let selectedId = "";
    let mode = "select";
    let dirty = false;
    let activeAction = null;
    let imageWidth = 1000;
    let imageHeight = 1000;

    const editorImage = el("img", { src: photo.src, alt: photo.title || "注釈する現場写真" });
    const editorSvg = svgEl("svg", {
      className: "annotation-editor-svg",
      preserveAspectRatio: "xMidYMid meet",
      role: "img",
      "aria-label": "写真注釈編集エリア",
    });
    const stage = el("div", { className: "annotation-stage" }, [editorImage, editorSvg]);
    const modeStatus = el("span", { className: "annotation-mode-status" });
    const undoButton = button("1つ戻す", "btn", undo);
    const deleteButton = button("選択中の印を削除", "btn danger", deleteSelected);
    const modeButtons = {};

    const toolbar = el("div", { className: "annotation-toolbar" }, [
      (modeButtons.select = button("選択 / 移動", "btn", () => setMode("select"))),
      (modeButtons.circle = button("〇を追加", "btn", () => setMode("circle"))),
      (modeButtons.arrow = button("矢印を追加", "btn", () => setMode("arrow"))),
      undoButton,
      deleteButton,
      button("すべて消す", "btn danger", clearAll),
    ]);

    const overlay = el("div", { className: "annotation-screen" }, [
      el("div", { className: "annotation-dialog" }, [
        el("div", { className: "annotation-dialog-header" }, [
          el("div", {}, [
            el("h2", { text: "写真に印をつける" }),
            el("p", { text: "〇または矢印を選び、写真上をドラッグしてください。" }),
          ]),
          modeStatus,
        ]),
        toolbar,
        el("div", { className: "annotation-stage-wrap" }, [stage]),
        el("p", {
          className: "annotation-help",
          text: "選択中の印はドラッグで移動できます。〇は四隅、矢印は両端の丸をドラッグすると調整できます。",
        }),
        el("div", { className: "annotation-dialog-actions" }, [
          button("キャンセル", "btn", cancel),
          button("保存", "btn primary", save),
        ]),
      ]),
    ]);

    function setMode(nextMode) {
      mode = nextMode;
      selectedId = "";
      renderEditor();
    }

    function snapshot() {
      history.push(clone(draft));
      if (history.length > 30) history.shift();
    }

    function undo() {
      if (!history.length) return;
      draft = history.pop();
      selectedId = "";
      dirty = JSON.stringify(draft) !== initialAnnotations;
      renderEditor();
    }

    function deleteSelected() {
      if (!selectedId) return;
      snapshot();
      draft = draft.filter((item) => item.id !== selectedId);
      selectedId = "";
      dirty = true;
      renderEditor();
    }

    function clearAll() {
      if (!draft.length || !window.confirm("写真上の印をすべて消しますか？")) return;
      snapshot();
      draft = [];
      selectedId = "";
      dirty = true;
      renderEditor();
    }

    function cancel() {
      if (dirty && !window.confirm("保存していない変更があります。保存せずに閉じますか？")) return;
      close();
    }

    function save() {
      photo.annotations = normalizeAnnotations(draft);
      close();
      saveState();
      render();
    }

    function close() {
      document.removeEventListener("keydown", handleKeydown);
      document.body.classList.remove("annotation-open");
      overlay.remove();
    }

    function handleKeydown(event) {
      if (event.key === "Escape") cancel();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName || "")) {
        event.preventDefault();
        deleteSelected();
      }
    }

    function pointFromEvent(event) {
      const rect = editorSvg.getBoundingClientRect();
      return {
        x: clamp((event.clientX - rect.left) / Math.max(1, rect.width), 0, 1),
        y: clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1),
      };
    }

    function startShape(event) {
      if (event.button !== 0) return;
      if (mode === "select") {
        selectedId = "";
        renderEditor();
        return;
      }
      event.preventDefault();
      const point = pointFromEvent(event);
      snapshot();
      const annotation =
        mode === "circle"
          ? createCircleAnnotation(point)
          : createArrowAnnotation(point);
      draft.push(annotation);
      dirty = true;
      selectedId = annotation.id;
      activeAction = { kind: "create", id: annotation.id, start: point };
      editorSvg.setPointerCapture(event.pointerId);
      renderEditor();
    }

    function selectShape(event, annotationId, actionKind) {
      if (mode !== "select" || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const annotation = draft.find((item) => item.id === annotationId);
      if (!annotation) return;
      selectedId = annotationId;
      activeAction = {
        kind: actionKind,
        id: annotationId,
        start: pointFromEvent(event),
        original: clone(annotation),
        historyPushed: false,
      };
      editorSvg.setPointerCapture(event.pointerId);
      renderEditor();
    }

    function movePointer(event) {
      if (!activeAction) return;
      const point = pointFromEvent(event);
      const annotation = draft.find((item) => item.id === activeAction.id);
      if (!annotation) return;
      if (activeAction.kind !== "create" && !activeAction.historyPushed) {
        snapshot();
        activeAction.historyPushed = true;
        dirty = true;
      }
      if (activeAction.kind === "create") {
        if (annotation.type === "circle") {
          annotation.cx = (activeAction.start.x + point.x) / 2;
          annotation.cy = (activeAction.start.y + point.y) / 2;
          annotation.rx = Math.abs(point.x - activeAction.start.x) / 2;
          annotation.ry = Math.abs(point.y - activeAction.start.y) / 2;
        } else {
          annotation.x2 = point.x;
          annotation.y2 = point.y;
        }
      } else if (activeAction.kind === "move") {
        const dx = point.x - activeAction.start.x;
        const dy = point.y - activeAction.start.y;
        moveAnnotation(annotation, activeAction.original, dx, dy);
      } else if (activeAction.kind === "circle-resize") {
        annotation.rx = clamp(Math.abs(point.x - annotation.cx), 0.01, Math.max(0.01, Math.min(annotation.cx, 1 - annotation.cx)));
        annotation.ry = clamp(Math.abs(point.y - annotation.cy), 0.01, Math.max(0.01, Math.min(annotation.cy, 1 - annotation.cy)));
      } else if (activeAction.kind === "arrow-start") {
        annotation.x1 = point.x;
        annotation.y1 = point.y;
      } else if (activeAction.kind === "arrow-end") {
        annotation.x2 = point.x;
        annotation.y2 = point.y;
      }
      renderEditor();
    }

    function endPointer(event) {
      if (!activeAction) return;
      const annotation = draft.find((item) => item.id === activeAction.id);
      if (annotation?.type === "circle") {
        annotation.rx = Math.max(annotation.rx, 0.025);
        annotation.ry = Math.max(annotation.ry, 0.025);
      }
      if (annotation?.type === "arrow" && Math.hypot(annotation.x2 - annotation.x1, annotation.y2 - annotation.y1) < 0.04) {
        annotation.x2 = clamp(annotation.x1 + 0.12, 0, 1);
        annotation.y2 = clamp(annotation.y1 + 0.08, 0, 1);
      }
      activeAction = null;
      if (editorSvg.hasPointerCapture(event.pointerId)) editorSvg.releasePointerCapture(event.pointerId);
      mode = "select";
      renderEditor();
    }

    function renderEditor() {
      editorSvg.setAttribute("viewBox", `0 0 ${imageWidth} ${imageHeight}`);
      drawAnnotationShapes(editorSvg, draft, imageWidth, imageHeight, { onSelect: selectShape });
      const selected = draft.find((item) => item.id === selectedId);
      if (selected) appendSelectionHandles(editorSvg, selected, imageWidth, imageHeight, selectShape);
      Object.entries(modeButtons).forEach(([key, node]) => node.classList.toggle("active", key === mode));
      modeStatus.textContent = mode === "circle" ? "操作：〇を追加" : mode === "arrow" ? "操作：矢印を追加" : "操作：選択 / 移動";
      undoButton.disabled = !history.length;
      deleteButton.disabled = !selectedId;
      editorSvg.classList.toggle("drawing", mode !== "select");
    }

    editorImage.addEventListener("load", () => {
      imageWidth = editorImage.naturalWidth || 1000;
      imageHeight = editorImage.naturalHeight || 1000;
      renderEditor();
    });
    editorSvg.addEventListener("pointerdown", startShape);
    editorSvg.addEventListener("pointermove", movePointer);
    editorSvg.addEventListener("pointerup", endPointer);
    editorSvg.addEventListener("pointercancel", endPointer);
    document.addEventListener("keydown", handleKeydown);
    document.body.classList.add("annotation-open");
    document.body.appendChild(overlay);
    renderEditor();
  }

  function createCircleAnnotation(point) {
    return {
      id: createId(),
      type: "circle",
      cx: point.x,
      cy: point.y,
      rx: 0,
      ry: 0,
      strokeColor: "#c5222d",
      strokeWidth: 8,
      outlineColor: "#ffffff",
      outlineWidth: 14,
    };
  }

  function createArrowAnnotation(point) {
    return {
      id: createId(),
      type: "arrow",
      x1: point.x,
      y1: point.y,
      x2: point.x,
      y2: point.y,
      strokeColor: "#c5222d",
      strokeWidth: 8,
      outlineColor: "#ffffff",
      outlineWidth: 14,
      arrowHeadSize: 40,
    };
  }

  function moveAnnotation(annotation, original, dx, dy) {
    if (annotation.type === "circle") {
      annotation.cx = clamp(original.cx + dx, original.rx, 1 - original.rx);
      annotation.cy = clamp(original.cy + dy, original.ry, 1 - original.ry);
      return;
    }
    const minX = Math.min(original.x1, original.x2);
    const maxX = Math.max(original.x1, original.x2);
    const minY = Math.min(original.y1, original.y2);
    const maxY = Math.max(original.y1, original.y2);
    const safeDx = clamp(dx, -minX, 1 - maxX);
    const safeDy = clamp(dy, -minY, 1 - maxY);
    annotation.x1 = original.x1 + safeDx;
    annotation.y1 = original.y1 + safeDy;
    annotation.x2 = original.x2 + safeDx;
    annotation.y2 = original.y2 + safeDy;
  }

  function appendSelectionHandles(svg, annotation, width, height, onSelect) {
    const handleRadius = Math.max(8, Math.min(width, height) * 0.012);
    const appendHandle = (x, y, action) => {
      const handle = svgEl("circle", {
        cx: x * width,
        cy: y * height,
        r: handleRadius,
        className: "annotation-handle",
        "vector-effect": "non-scaling-stroke",
      });
      handle.addEventListener("pointerdown", (event) => onSelect(event, annotation.id, action));
      svg.appendChild(handle);
    };

    if (annotation.type === "circle") {
      svg.appendChild(
        svgEl("rect", {
          x: (annotation.cx - annotation.rx) * width,
          y: (annotation.cy - annotation.ry) * height,
          width: annotation.rx * 2 * width,
          height: annotation.ry * 2 * height,
          className: "annotation-selection-box",
          "vector-effect": "non-scaling-stroke",
        }),
      );
      [
        [annotation.cx - annotation.rx, annotation.cy - annotation.ry],
        [annotation.cx + annotation.rx, annotation.cy - annotation.ry],
        [annotation.cx - annotation.rx, annotation.cy + annotation.ry],
        [annotation.cx + annotation.rx, annotation.cy + annotation.ry],
      ].forEach(([x, y]) => appendHandle(x, y, "circle-resize"));
    } else {
      appendHandle(annotation.x1, annotation.y1, "arrow-start");
      appendHandle(annotation.x2, annotation.y2, "arrow-end");
    }
  }

  function normalizeAnnotations(annotations) {
    if (!Array.isArray(annotations)) return [];
    const numeric = (value, fallback) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    return annotations
      .filter((item) => item && (item.type === "circle" || item.type === "arrow"))
      .map((item) => {
        const base = {
          id: item.id || createId(),
          type: item.type,
          strokeColor: item.strokeColor || "#c5222d",
          strokeWidth: Number(item.strokeWidth) || 8,
          outlineColor: item.outlineColor || "#ffffff",
          outlineWidth: Number(item.outlineWidth) || 14,
        };
        if (item.type === "circle") {
          const cx = clamp(numeric(item.cx, 0.5), 0, 1);
          const cy = clamp(numeric(item.cy, 0.5), 0, 1);
          return {
            ...base,
            cx,
            cy,
            rx: clamp(numeric(item.rx, 0.08), 0.01, Math.max(0.01, Math.min(cx, 1 - cx))),
            ry: clamp(numeric(item.ry, 0.08), 0.01, Math.max(0.01, Math.min(cy, 1 - cy))),
          };
        }
        return {
          ...base,
          x1: clamp(numeric(item.x1, 0.25), 0, 1),
          y1: clamp(numeric(item.y1, 0.25), 0, 1),
          x2: clamp(numeric(item.x2, 0.65), 0, 1),
          y2: clamp(numeric(item.y2, 0.65), 0, 1),
          arrowHeadSize: numeric(item.arrowHeadSize, 40),
        };
      });
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function renderProcessDiagramEditor() {
    const diagram = state.processDiagram;
    const toggle = el("input", {
      type: "checkbox",
      onchange: (event) => {
        diagram.enabled = event.target.checked;
        saveState();
        render();
      },
    });
    toggle.checked = Boolean(diagram.enabled);

    const editor = el("div", { className: "process-diagram-editor" }, [
      el("label", { className: "process-diagram-toggle" }, [
        toggle,
        el("span", {}, [
          el("strong", { text: "工程図解を表示する" }),
          el("small", { text: "必要な報告書だけ、プレビューとPDFへ掲載します。" }),
        ]),
      ]),
    ]);

    if (!diagram.enabled) return editor;

    const list = el("div", { className: "process-diagram-item-list" });
    diagram.items.forEach((item, index) => list.appendChild(renderProcessDiagramItemEditor(item, index)));
    if (!diagram.items.length) {
      list.appendChild(el("div", { className: "empty", text: "工程カードを追加してください" }));
    }

    editor.appendChild(
      el("div", { className: "process-diagram-editor-body" }, [
        el("div", { className: "process-diagram-toolbar" }, [
          selectField(
            "図解テンプレート",
            diagram.templateId || "free",
            processDiagramTemplates.map((template) => template.id),
            (templateId) => applyProcessDiagramTemplate(templateId),
            (templateId) => processDiagramTemplates.find((template) => template.id === templateId)?.name || templateId,
          ),
          button("選択中のテンプレートを再適用", "btn small", () => applyProcessDiagramTemplate(diagram.templateId || "free")),
        ]),
        el("div", { className: "form-grid" }, [
          inputField(
            "図解タイトル",
            diagram.title,
            (v) => patchProcessDiagramField("title", v),
            "full",
            "text",
            "例：鉄骨階段タイル改修の施工工程",
            textLimit("processTitle"),
          ),
          textareaField(
            "図解の説明文",
            diagram.description,
            (v) => patchProcessDiagramField("description", v),
            "full",
            "例：確認した状態を踏まえ、以下の順番で施工を進めます。",
            textLimit("processDescription"),
          ),
        ]),
        el("div", { className: "process-diagram-actions" }, [
          button("工程カードを追加", "btn primary small", addProcessDiagramStep),
          button("区切り文を追加", "btn small", addProcessDiagramDivider),
        ]),
        list,
      ]),
    );

    return editor;
  }

  function renderProcessDiagramItemEditor(item, index) {
    const isDivider = item.type === "divider";
    return el("article", { className: `process-diagram-item-editor ${isDivider ? "divider" : "step"}` }, [
      el("div", { className: "process-diagram-item-head" }, [
        el("strong", { text: isDivider ? "区切り文" : `工程カード ${item.number || index + 1}` }),
        el("div", { className: "mini-actions" }, [
          button("上へ", "btn small", () => moveProcessDiagramItem(index, -1), index === 0),
          button("下へ", "btn small", () => moveProcessDiagramItem(index, 1), index === state.processDiagram.items.length - 1),
          button("削除", "btn danger small", () => deleteProcessDiagramItem(item.id)),
        ]),
      ]),
      isDivider
          ? textareaField(
            "区切り文",
            item.text,
            (v) => patchProcessDiagramItem(item.id, "text", v),
            "full",
            "例：ここから補修工程に入ります。",
            textLimit("processDivider"),
          )
        : el("div", { className: "process-diagram-item-fields" }, [
            inputField("工程番号", item.number, (v) => patchProcessDiagramItem(item.id, "number", v), "", "text", "例：1"),
            inputField("工程名", item.title, (v) => patchProcessDiagramItem(item.id, "title", v), "", "text", "例：下地確認", textLimit("processStepTitle")),
            textareaField(
              "補足説明（任意）",
              item.note,
              (v) => patchProcessDiagramItem(item.id, "note", v),
              "full",
              "例：既存の状態を確認し、施工範囲を整理します。",
              textLimit("processStepNote"),
            ),
          ]),
    ]);
  }

  function renderDataPanel() {
    return panel("データ", [
      el("div", { className: "data-help" }, [
        el("p", { text: "開く：保存済みの報告書フォルダを開きます。" }),
        el("p", { text: "上書き保存：現在開いている報告書フォルダに保存します。" }),
        el("p", { text: "名前を付けて保存：別の名前や場所に保存します。" }),
        el("p", { className: "company-settings-guide", text: "会社名・ロゴは、画面下部の「会社情報」から設定できます。" }),
      ]),
      el("div", { className: "row-actions" }, [
        button("新規作成", "btn", newReport),
        button("開く", "btn", openSavedData),
        button("上書き保存", "btn warn", saveCurrentReport),
        button("名前を付けて保存", "btn", saveDataAs),
        button("バックアップから復元", "btn", restoreFromBackup),
      ]),
    ]);
  }

  function renderCompanyPanel() {
    const company = state.company;

    return panel("会社情報設定", [
      el("div", { className: "company-settings-intro" }, [
        el("p", {
          text:
            "会社情報は、報告書の最終ページや印刷/PDFに表示される共通情報です。一度保存しておくと、次回以降の報告書にも自動で反映されます。必要に応じて編集できます。",
        }),
      ]),
      company.companyInfoChangedAt
        ? el("div", { className: "company-change-notice" }, [
            el("strong", { text: "会社情報が変更されています。" }),
            el("p", {
              text:
                "この内容は報告書の担当者欄や最終ページ、印刷/PDFに反映されます。会社名・電話番号・ロゴに間違いがないか確認してください。",
            }),
          ])
        : "",
      el("div", { className: "form-grid company-form-grid" }, [
        inputField("会社名", company.name, (v) => updateCompany("name", v)),
        inputField("屋号またはブランド名", company.brandName, (v) => updateCompany("brandName", v)),
        inputField("代表者名または担当者名", company.contactPerson, (v) => updateCompany("contactPerson", v)),
        inputField("郵便番号", company.postalCode, (v) => updateCompany("postalCode", v)),
        inputField("住所", company.address, (v) => updateCompany("address", v), "full"),
        inputField("電話番号", company.phone, (v) => updateCompany("phone", v)),
        inputField("メールアドレス", company.email, (v) => updateCompany("email", v), "", "email"),
        inputField("ホームページURL", company.website, (v) => updateCompany("website", v), "full", "url"),
        textareaField("対応サービス", company.services, (v) => updateCompany("services", v), "full"),
        textareaField("キャッチコピー", company.tagline, (v) => updateCompany("tagline", v), "full"),
      ]),
      el("div", { className: "company-logo-setting" }, [
        el("div", {}, [
          el("h3", { text: "会社ロゴ" }),
          el("p", { text: "ロゴは2点まで登録でき、報告書の最終ページに横並びで表示されます。" }),
        ]),
        el("div", { className: "company-logo-slots" }, [
          renderCompanyLogoSlot(1),
          renderCompanyLogoSlot(2),
        ]),
      ]),
    ], button("会社情報を基本設定として保存", "btn primary", saveCompanySettings));
  }

  function renderCompanyLogoSlot(slot) {
    const dataKey = slot === 1 ? "logoDataUrl" : "logo2DataUrl";
    const nameKey = slot === 1 ? "logoName" : "logo2Name";
    const logoInput = el("input", {
      type: "file",
      accept: "image/*",
      className: "company-logo-file",
      onchange: (event) => handleCompanyLogo(event, slot),
    });
    const preview = state.company[dataKey]
      ? el("div", { className: "company-logo-preview" }, [
          el("img", {
            src: state.company[dataKey],
            alt: `${companyDisplayName() || "会社"}のロゴ${slot}`,
          }),
          el("div", { className: "company-logo-meta" }, [
            el("strong", { text: state.company[nameKey] || `登録済みロゴ${slot}` }),
            button(`ロゴ${slot}を削除`, "btn danger small", () => removeCompanyLogo(slot)),
          ]),
        ])
      : el("div", { className: "company-logo-empty", text: `ロゴ${slot}はまだ登録されていません。` });

    return el("section", { className: "company-logo-slot" }, [
      el("h4", { text: `ロゴ${slot}` }),
      preview,
      el("div", { className: "row-actions company-logo-actions" }, [
        logoInput,
        button(`ロゴ${slot}画像を選択`, "btn", () => logoInput.click()),
      ]),
    ]);
  }

  function renderQualityPanel() {
    const checks = getQualityChecks();
    const issues = collectReportInputIssues();
    const requiredIssues = issues.filter((issue) => issue.level === "required");
    const recommendedIssues = issues.filter((issue) => issue.level === "recommended");
    return panel("品質チェック", [
      el("div", { className: "quality-issue-summary" }, [
        el("div", { className: `quality-count ${requiredIssues.length ? "required" : "ok"}` }, [
          el("span", { text: "要確認" }),
          el("strong", { text: `${requiredIssues.length}件` }),
        ]),
        el("div", { className: `quality-count ${recommendedIssues.length ? "recommended" : "ok"}` }, [
          el("span", { text: "確認推奨" }),
          el("strong", { text: `${recommendedIssues.length}件` }),
        ]),
        button("入力チェックを開く", "btn small", () => showInputCheckDialog()),
      ]),
      issues.length
        ? el("div", { className: "quality-issue-groups" }, [
            renderInputIssueGroup("要確認", requiredIssues, "required"),
            renderInputIssueGroup("確認推奨", recommendedIssues, "recommended"),
          ])
        : el("div", { className: "quality-input-ok", text: "大きな入力漏れは見つかりませんでした。" }),
      el("h3", { className: "quality-subheading", text: "文章内容の確認" }),
      el(
        "div",
        { className: "check-list" },
        checks.map((check) =>
          el("div", { className: `check-item ${check.ok ? "" : "warn"}`.trim() }, [
            el("div", { className: "check-icon", text: check.ok ? "✓" : "!" }),
            el("div", {}, [el("strong", { text: check.title }), el("p", { text: check.message })]),
          ]),
        ),
      ),
    ]);
  }

  function renderInputIssueGroup(title, issues, level) {
    if (!issues.length) return "";
    return el("section", { className: `input-issue-group ${level}` }, [
      el("h3", { text: `${title}（${issues.length}件）` }),
      el(
        "ul",
        {},
        issues.map((issue) =>
          el("li", {}, [
            el("strong", { text: issue.title }),
            el("span", { text: issue.message }),
          ]),
        ),
      ),
    ]);
  }

  function renderPreview() {
    return el("aside", { className: "preview-wrap" }, [
      el("div", { className: "preview-toolbar" }, [
        el("h2", { text: "報告書プレビュー" }),
        el("div", { className: "row-actions" }, [
          button("上書き保存", "btn small", saveCurrentReport),
          button("印刷 / PDF", "btn primary small", requestPrint),
        ]),
      ]),
      renderReport(),
    ]);
  }

  function renderReport() {
    const firstPhoto = state.photos[0];
    const reportCompanyName = companyDisplayName();

    return el("article", { className: "report" }, [
      el("div", { className: "report-page" }, [
        renderPrintRunningMeta(),
        el("section", { className: "report-cover" }, [
          el("div", { className: "cover-copy" }, [
            reportCompanyName ? el("div", { className: "report-kicker", text: reportCompanyName }) : "",
            el("div", { className: "cover-work-title", text: state.project.workName || state.project.title || "工事名未入力" }),
            el("h1", { text: "建物調査報告書" }),
          ]),
          el("div", { className: "cover-side" }, [
            el("p", {
              className: "report-lead cover-lead",
              text: `${state.project.clientName || "お客様"}へ、現地で確認した内容を分かりやすく整理しました。必要と思われる対応と注意点を、判断しやすい形でお伝えします。`,
            }),
            el("div", { className: "cover-photo" }, [
              firstPhoto && firstPhoto.src
                ? renderAnnotatedImage(firstPhoto, "", firstPhoto.title || "現場写真", "cover")
                : el("div", { className: "cover-placeholder", text: "現場写真" }),
            ]),
          ]),
          el("div", { className: "cover-info" }, [
            meta("お客様名", state.project.clientName),
            meta("調査日時", formatSurveyDateTime()),
            companyContactMeta(),
            meta("住所", state.project.address),
            meta("建物", state.project.buildingType),
            meta("相談内容", state.project.projectType),
            meta("天気", state.project.weather),
            meta("調査目的", state.project.purpose),
          ]),
        ]),
        renderAssessmentReport(),
        reportSection("1. お客様のご不安・ご相談内容", [
          reportTextBox("ご相談内容", state.summary.customerConcern),
        ]),
        reportSection("2. 調査写真・確認項目ごとの確認結果", [
          renderFindingReportContent(),
          renderPhotoReportContent(),
        ], "photo-section"),
        reportSection("3. おすすめする施工方針", [
          optionalReportTextBox("ご提案内容", state.proposal.planName),
          optionalReportTextBox("おすすめする施工方針", state.summary.recommendation),
          optionalReportTextBox("主な工事内容", state.proposal.scope),
          renderRepairProcessCard(),
        ], "text-section plan-section"),
        state.summary.additionalRecommendations
          ? reportSection("4. あわせておすすめしたい対策", [
              reportTextBox("あわせておすすめしたい対策", state.summary.additionalRecommendations),
            ], "text-section additional-section")
          : "",
        state.proposal.cautions || state.proposal.watchPoint
          ? reportSection("5. 工事中に確認が必要なこと", [
              el("div", { className: "timeline" }, [
                state.proposal.cautions ? timelineItem("工事中に確認が必要なこと", state.proposal.cautions) : "",
                state.proposal.watchPoint ? timelineItem("今後注意しておきたい点", state.proposal.watchPoint) : "",
              ]),
            ], "text-section attention-section")
          : "",
        reportSection("6. 全体まとめ", [
          el("div", { className: "report-box" }, [
            el("span", { className: "report-section-label", text: "総合所見" }),
            el("p", { className: "report-copy", text: safeText(state.summary.overall || state.proposal.totalOpinion) }),
          ]),
        ], "text-section"),
        state.proposal.closing
          ? reportSection("7. 最後にお伝えしたいこと", [
              el("div", { className: "closing" }, [
                el("p", { text: state.proposal.closing }),
              ]),
            ], "text-section closing-section")
          : "",
        renderCompanyProfile(),
      ]),
    ]);
  }

  function renderPrintRunningMeta() {
    const dateText = formatDate(state.project.surveyDate);
    const text = [state.project.workName, dateText].map(safeText).filter(Boolean).join(" / ");
    return text ? el("div", { className: "print-running-meta", text }) : "";
  }

  function renderFindingReportSection() {
    return reportSection("確認項目ごとの確認結果", [renderFindingReportContent()]);
  }

  function renderFindingReportContent() {
    const content = state.findings.length
      ? el(
          "div",
          { className: "finding-report-list" },
          state.findings.map((finding) =>
            el("div", { className: "finding-report" }, [
              el("div", {}, [priorityBadge(finding.priority), finding.condition ? el("p", { style: "margin-top:8px", text: finding.condition }) : ""]),
              el("div", {}, [
                el("h3", { text: finding.area }),
                findingTopic("確認内容", finding.observation),
                findingTopic("考えられること", finding.concern),
                findingTopic("対応の考え方", finding.proposal),
              ]),
            ]),
          ),
        )
      : el("div", { className: "empty", text: "確認項目はまだ入力されていません" });

    return content;
  }

  function findingTopic(label, value) {
    return el("p", { className: "finding-topic" }, [
      el("strong", { text: label }),
      el("span", { text: safeText(value) }),
    ]);
  }

  function renderPhotoReportSection() {
    return reportSection("現場写真", [renderPhotoReportContent()]);
  }

  function renderPhotoReportContent() {
    const content = state.photos.length
      ? el(
          "div",
          { className: "photo-report-grid" },
          state.photos.map((photo, index) =>
            el("figure", { className: `photo-report ${isWidePhoto(photo) ? "wide" : ""}`.trim() }, [
              photo.src
                ? renderAnnotatedImage(photo, "", photo.title || "現場写真", "cover")
                : el("div", { className: "photo-missing", text: "写真データを読み込めませんでした" }),
              el("figcaption", { className: "photo-caption" }, [
                el("strong", { text: photo.title || photo.area || "現場写真" }),
                el("dl", { className: "photo-detail-list" }, [
                  photo.area ? detailItem("撮影箇所", photo.area) : "",
                  photo.condition ? detailItem("調査結果の目安", photo.condition) : "",
                  photo.finding || photo.memo ? detailItem("現在の状態", photo.finding || photo.memo) : "",
                  photo.recommendation ? detailItem("この箇所の対応目安", photo.recommendation) : "",
                ]),
              ]),
            ]),
          ),
        )
      : el("div", { className: "empty", text: "写真を追加すると、ここに掲載されます" });

    return content;
  }

  function isWidePhoto(photo) {
    const text = [photo.title, photo.area, photo.condition, photo.finding, photo.recommendation].join(" ");
    return text.length > 260 || /優先対応|早期対応推奨|穴あき|雨漏り|雨水の浸入|腐食が進行/.test(text);
  }

  function detailItem(label, value) {
    return el("div", {}, [el("dt", { text: label }), el("dd", { text: value || "" })]);
  }

  function renderRepairProcessCard() {
    const diagram = state.processDiagram;
    if (!diagram || !diagram.enabled) return "";
    const visibleItems = diagram.items.filter((item) =>
      item.type === "divider" ? safeText(item.text).trim() : safeText(item.title).trim(),
    );
    let fallbackStepNumber = 0;
    const flowItems = visibleItems.map((item) => {
      if (item.type === "divider") {
        return el("div", { className: `repair-flow-note ${item.variant || "branch"}` }, [el("span", { text: item.text })]);
      }
      fallbackStepNumber += 1;
      return el("div", { className: `repair-step ${item.variant || "normal"} ${item.note ? "has-note" : ""}`.trim() }, [
        el("b", { text: safeText(item.number) || String(fallbackStepNumber) }),
        el("div", { className: "repair-step-copy" }, [
          el("span", { className: "repair-step-title", text: item.title }),
          item.note ? el("p", { text: item.note }) : "",
        ]),
      ]);
    });

    return el("div", { className: "repair-process-card" }, [
      el("div", { className: "repair-process-head" }, [
        el("span", { className: "report-section-label", text: "工程図解" }),
        diagram.title ? el("h3", { text: diagram.title }) : "",
        diagram.description ? el("p", { text: diagram.description }) : "",
      ]),
      el(
        "div",
        { className: "repair-flow" },
        flowItems,
      ),
    ]);
  }

  function panel(title, children, action) {
    return el("section", { className: "panel" }, [
      el("div", { className: "panel-header" }, [el("h2", { text: title }), action || el("span")]),
      el("div", { className: "panel-body" }, children),
    ]);
  }

  function inputField(label, value, onInput, className = "", type = "text", placeholder, limit = 0) {
    if (limit && type !== "date") {
      return countedTextField(label, value, onInput, limit, className, false, placeholder);
    }
    const hint = type === "date" && !value ? fieldPlaceholders[label] || "日付を選択" : "";
    const placeholderText = placeholder === undefined ? fieldPlaceholders[label] || "" : placeholder;
    return el("div", { className: `field ${className}`.trim() }, [
      el("label", { text: label }),
      el("input", {
        type,
        value: value || "",
        className: value ? "" : "is-empty",
        placeholder: placeholderText,
        oninput: (event) => {
          event.target.classList.toggle("is-empty", !event.target.value);
          onInput(event.target.value);
        },
        onblur: render,
      }),
      hint ? el("span", { className: "field-hint", text: hint }) : "",
    ]);
  }

  function textareaField(label, value, onInput, className = "", placeholder, limit = 0) {
    if (limit) {
      return countedTextField(label, value, onInput, limit, className, true, placeholder);
    }
    const placeholderText = placeholder === undefined ? fieldPlaceholders[label] || "" : placeholder;
    return el("div", { className: `field ${className}`.trim() }, [
      el("label", { text: label }),
      el("textarea", {
        value: value || "",
        placeholder: placeholderText,
        oninput: (event) => {
          autoResizeTextarea(event.target);
          onInput(event.target.value);
        },
        onblur: render,
      }),
    ]);
  }

  function countedTextField(label, value, onInput, limit, className = "", multiline = false, placeholder) {
    const currentValue = safeText(value);
    const placeholderText = placeholder === undefined ? fieldPlaceholders[label] || "" : placeholder;
    const countNode = el("span", { className: "character-count" });
    const warningNode = el("span", { className: "character-count-message" });
    const input = el(multiline ? "textarea" : "input", {
      type: multiline ? undefined : "text",
      value: currentValue,
      placeholder: placeholderText,
      className: currentValue ? "" : "is-empty",
      oninput: (event) => {
        event.target.classList.toggle("is-empty", !event.target.value);
        if (multiline) autoResizeTextarea(event.target);
        updateCharacterCount(event.target.value, limit, countNode, warningNode);
        onInput(event.target.value);
      },
      onblur: render,
    });
    updateCharacterCount(currentValue, limit, countNode, warningNode);

    return el("div", { className: `field counted-field ${className}`.trim() }, [
      el("label", { text: label }),
      input,
      el("div", { className: "character-count-row" }, [warningNode, countNode]),
    ]);
  }

  function autoResizeTextarea(textarea) {
    if (!textarea || textarea.tagName !== "TEXTAREA") return;
    const maxHeight = 420;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight + 2, 104), maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }

  function scheduleAutoResizeTextareas() {
    window.requestAnimationFrame(() => {
      document.querySelectorAll("textarea").forEach(autoResizeTextarea);
    });
  }

  function updateCharacterCount(value, limit, countNode, warningNode) {
    const count = textLength(value);
    const warningThreshold = Math.ceil(limit * PDF_WARNING_RATIO);
    const status = count > limit ? "over" : count >= warningThreshold ? "near" : "";
    countNode.className = `character-count ${status}`.trim();
    countNode.textContent = `${count} / ${limit}字`;
    warningNode.className = `character-count-message ${status}`.trim();
    warningNode.textContent =
      status === "over"
        ? "文字数がオーバーしています。PDFで文字が重なる可能性があります。"
        : status === "near"
          ? "文字数が多めです。PDFで文字が詰まる可能性があります。"
          : "";
  }

  function textLength(value) {
    return Array.from(safeText(value)).length;
  }

  function textLimit(ruleKey) {
    return PDF_TEXT_FIELD_RULES[ruleKey]?.maxLength || 0;
  }

  function selectField(label, value, options, onInput, formatter = (v) => v) {
    return el("div", { className: "field" }, [
      el("label", { text: label }),
      selectInline(value, options, onInput, formatter),
    ]);
  }

  function selectFieldWithOther(label, value, options, onInput, formatter = (v) => v, otherLimit = 0) {
    return el("div", { className: "field" }, [
      el("label", { text: label }),
      selectInlineWithOther(value, options, onInput, formatter, otherLimit),
    ]);
  }

  function selectInline(value, options, onInput, formatter = (v) => v) {
    return el(
      "select",
      {
        value: value || "",
        className: value ? "" : "is-empty",
        onchange: (event) => {
          onInput(event.target.value);
          render();
        },
      },
      [
        el("option", { value: "", text: "選択してください" }),
        ...options.map((option) => el("option", { value: option, text: formatter(option) })),
      ],
    );
  }

  function selectInlineWithOther(value, options, onInput, formatter = (v) => v, otherLimit = 0) {
    const selectOptions = options.filter((option) => option !== "その他");
    const currentValue = isOtherValue(value, options) ? OTHER_VALUE : value || "";
    return el("span", { className: "select-other" }, [
      el(
        "select",
        {
          value: currentValue,
          className: currentValue ? "" : "is-empty",
          onchange: (event) => {
            onInput(event.target.value === OTHER_VALUE ? "その他" : event.target.value);
            render();
          },
        },
        [
          el("option", { value: "", text: "選択してください" }),
          ...selectOptions.map((option) => el("option", { value: option, text: formatter(option) })),
          el("option", { value: OTHER_VALUE, text: "その他（自由入力）" }),
        ],
      ),
      isOtherValue(value, options)
        ? otherLimit
          ? countedTextControl(value === "その他" ? "" : value || "", onInput, otherLimit, "具体的な内容を入力")
          : el("input", {
              type: "text",
              value: value === "その他" ? "" : value || "",
              placeholder: "具体的な内容を入力",
              oninput: (event) => onInput(event.target.value),
              onblur: render,
            })
        : "",
    ]);
  }

  function countedTextControl(value, onInput, limit, placeholder) {
    const currentValue = safeText(value);
    const countNode = el("span", { className: "character-count" });
    const warningNode = el("span", { className: "character-count-message" });
    const input = el("input", {
      type: "text",
      value: currentValue,
      placeholder,
      className: currentValue ? "" : "is-empty",
      oninput: (event) => {
        event.target.classList.toggle("is-empty", !event.target.value);
        updateCharacterCount(event.target.value, limit, countNode, warningNode);
        onInput(event.target.value);
      },
      onblur: render,
    });
    updateCharacterCount(currentValue, limit, countNode, warningNode);
    return el("span", { className: "counted-field counted-control" }, [
      input,
      el("span", { className: "character-count-row" }, [warningNode, countNode]),
    ]);
  }

  function isOtherValue(value, options) {
    if (!value) return false;
    return value === "その他" || !options.includes(value);
  }

  function isBlank(value) {
    return String(value ?? "").trim() === "";
  }

  function collectReportInputIssues() {
    const issues = [];
    const add = (level, section, title, message) => {
      issues.push({ level, section, title, message });
    };
    const requireValue = (value, section, title) => {
      if (isBlank(value)) add("required", section, title, `${title}が未入力です。`);
    };
    const recommendValue = (value, section, title) => {
      if (isBlank(value)) add("recommended", section, title, `${title}が未入力です。`);
    };
    const requireOtherValue = (value, section, title) => {
      if (String(value ?? "").trim() === "その他") {
        add("required", section, title, `${title}でその他を選択していますが、自由入力が未入力です。`);
        return true;
      }
      return false;
    };

    requireValue(state.project.clientName, "基本情報", "お客様名");
    requireValue(state.project.workName || state.project.title, "基本情報", "工事名");
    requireValue(state.project.address, "基本情報", "現場住所");
    requireValue(state.project.surveyDate, "基本情報", "調査日");
    requireValue(state.project.inspector, "基本情報", "担当者");
    if (!requireOtherValue(state.project.projectType, "基本情報", "相談内容")) {
      requireValue(state.project.projectType, "基本情報", "相談内容");
    }
    requireOtherValue(state.project.buildingType, "基本情報", "建物種別");
    requireValue(state.project.purpose, "基本情報", "調査目的");
    recommendValue(state.project.weather, "基本情報", "天気");

    requireValue(state.summary.customerConcern, "ご相談内容", "お客様のご不安・ご相談内容");
    requireValue(state.summary.overall, "全体まとめ", "全体のまとめ");
    requireValue(state.summary.recommendation, "施工方針", "おすすめする施工方針");
    requireValue(state.proposal.scope, "施工方針", "主な工事内容");
    requireValue(state.proposal.closing, "施工方針", "最後にお伝えしたいこと");

    recommendValue(state.summary.additionalRecommendations, "施工方針", "あわせておすすめしたい対策");
    recommendValue(state.proposal.cautions, "施工方針", "工事中に確認が必要なこと");
    recommendValue(state.proposal.watchPoint, "施工方針", "今後注意しておきたい点");

    if (!state.photos.length) {
      add("required", "調査写真", "現場写真", "写真が1枚も追加されていません。");
    }
    state.photos.forEach((photo, index) => {
      const prefix = `写真${index + 1}`;
      requireValue(photo.title, "調査写真", `${prefix}：写真タイトル`);
      requireValue(photo.area, "調査写真", `${prefix}：撮影箇所`);
      if (!requireOtherValue(photo.condition, "調査写真", `${prefix}：調査結果の目安`)) {
        requireValue(photo.condition, "調査写真", `${prefix}：調査結果の目安`);
      }
      requireValue(photo.finding || photo.memo, "調査写真", `${prefix}：現在の状態`);
      requireValue(photo.recommendation, "調査写真", `${prefix}：この箇所の対応目安`);
    });

    if (!state.findings.length) {
      add("required", "確認項目", "確認項目", "確認項目が1件も追加されていません。");
    }
    state.findings.forEach((finding, index) => {
      const prefix = `確認項目${index + 1}`;
      requireValue(finding.area, "確認項目", `${prefix}：確認項目名`);
      requireValue(finding.condition, "確認項目", `${prefix}：状態`);
      requireValue(finding.priority, "確認項目", `${prefix}：対応の目安`);
      requireValue(finding.observation, "確認項目", `${prefix}：確認した内容`);
      requireValue(finding.concern, "確認項目", `${prefix}：考えられること・注意点`);
      requireValue(finding.proposal, "確認項目", `${prefix}：対応の考え方`);
    });

    recommendValue(state.assessment.overall, "今回の確認結果にもとづく目安", "総合目安");
    recommendValue(state.assessment.urgency, "今回の確認結果にもとづく目安", "緊急性について");
    recommendValue(state.assessment.policy, "今回の確認結果にもとづく目安", "おすすめの方向性");

    if (state.processDiagram.enabled) {
      recommendValue(state.processDiagram.title, "工程図解", "図解タイトル");
      recommendValue(state.processDiagram.description, "工程図解", "図解の説明文");
      state.processDiagram.items.forEach((item, index) => {
        if (item.type === "divider") {
          recommendValue(item.text, "工程図解", `区切り文${index + 1}`);
        } else {
          recommendValue(item.number, "工程図解", `工程${index + 1}：工程番号`);
          recommendValue(item.title, "工程図解", `工程${item.number || index + 1}：工程名`);
        }
      });
    }

    return issues;
  }

  function showInputCheckDialog(options = {}) {
    const issues = options.issues || collectReportInputIssues();
    const beforePrint = Boolean(options.beforePrint);
    const requiredIssues = issues.filter((issue) => issue.level === "required");
    const recommendedIssues = issues.filter((issue) => issue.level === "recommended");

    return new Promise((resolve) => {
      const results = issues.length
        ? el("div", { className: "input-check-results" }, [
            renderInputIssueGroup("要確認", requiredIssues, "required"),
            renderInputIssueGroup("確認推奨", recommendedIssues, "recommended"),
          ])
        : el("div", { className: "input-check-success", text: "大きな入力漏れは見つかりませんでした。" });
      const overlay = el("div", { className: "confirm-screen" }, [
        el("div", { className: "confirm-dialog input-check-dialog" }, [
          el("h2", { text: beforePrint ? "未入力または確認が必要な項目があります。" : "入力チェック結果" }),
          el("p", {
            text: issues.length
              ? "未入力の可能性がある項目です。必要に応じて修正してください。現場の状況によっては、空欄のままでも問題ない場合があります。"
              : "お客様向け報告書として、主な入力項目を確認しました。",
          }),
          results,
          el("div", { className: "confirm-actions" }, [
            button(beforePrint ? "修正する" : "閉じる", "btn", () => finish(false)),
            beforePrint ? button("このままPDFへ進む", "btn primary", () => finish(true)) : "",
          ]),
        ]),
      ]);

      function finish(continuePrint) {
        overlay.remove();
        resolve(continuePrint);
      }

      document.body.appendChild(overlay);
    });
  }

  async function confirmMissingInputsBeforePrint() {
    const issues = collectReportInputIssues();
    if (!issues.length) return true;
    return showInputCheckDialog({ issues, beforePrint: true });
  }

  function metric(label, value) {
    return el("div", { className: "metric" }, [el("span", { text: label }), el("strong", { text: value })]);
  }

  function meta(label, value) {
    return el("div", {}, [el("span", { text: label }), el("strong", { text: value || "" })]);
  }

  function companyContactMeta() {
    const values = [companyDisplayName(), safeText(state.project.inspector).trim()].filter(Boolean);
    return el("div", { className: "cover-company-contact" }, [
      el("span", { text: "会社・担当者" }),
      el(
        "strong",
        {},
        values.length
          ? values.map((value) => el("span", { className: "cover-company-contact-line", text: value }))
          : [el("span", { className: "cover-company-contact-line", text: "" })],
      ),
    ]);
  }

  function renderCompanyProfile() {
    const company = state.company || {};
    const displayName = companyDisplayName(company);
    const brandName = safeText(company.brandName).trim();
    const details = [
      ["代表者・担当者", company.contactPerson],
      ["郵便番号", company.postalCode],
      ["住所", company.address],
      ["電話番号", company.phone],
      ["メールアドレス", company.email],
      ["ホームページ", company.website],
      ["対応サービス", company.services || company.contact],
    ].filter(([, value]) => safeText(value).trim());
    const logos = [
      { src: company.logoDataUrl, name: company.logoName, slot: 1 },
      { src: company.logo2DataUrl, name: company.logo2Name, slot: 2 },
    ].filter((logo) => safeText(logo.src).trim());
    const hasContent = Boolean(
      displayName ||
        logos.length ||
        company.tagline ||
        details.length,
    );
    if (!hasContent) return "";

    return el("section", { className: "company-profile-section" }, [
      el("div", { className: "company-profile-card" }, [
        el("div", { className: "company-profile-head" }, [
          el("div", { className: "company-profile-heading" }, [
            el("span", { className: "company-profile-kicker", text: "発行会社情報" }),
            el("h2", { text: displayName || "会社情報" }),
            brandName && brandName !== displayName
              ? el("p", { className: "company-profile-brand", text: brandName })
              : "",
            company.tagline ? el("p", { className: "company-profile-tagline", text: company.tagline }) : "",
          ]),
          logos.length
            ? el(
                "div",
                { className: `company-profile-logos ${logos.length === 1 ? "single" : ""}`.trim() },
                logos.map((logo) =>
                  el("div", { className: "company-profile-logo" }, [
                    el("img", {
                      src: logo.src,
                      alt: `${displayName || "会社"}のロゴ${logo.slot}`,
                      title: logo.name || `ロゴ${logo.slot}`,
                    }),
                  ]),
                ),
              )
            : "",
        ]),
        details.length
          ? el(
              "dl",
              { className: "company-profile-details" },
              details.map(([label, value]) =>
                el("div", { className: ["住所", "対応サービス"].includes(label) ? "wide" : "" }, [
                  el("dt", { text: label }),
                  el("dd", { text: safeText(value) }),
                ]),
              ),
            )
          : "",
      ]),
    ]);
  }

  function reportSection(title, children, className = "") {
    return el("section", { className: `report-section ${className}`.trim() }, [el("h2", { text: title }), ...children]);
  }

  function reportBox(label, value, note) {
    return el("div", { className: "report-box" }, [
      el("span", { className: "report-section-label", text: label }),
      el("strong", { text: value || "" }),
      note ? el("p", { text: note }) : "",
    ]);
  }

  function reportTextBox(label, value) {
    return el("div", { className: "report-box text-box" }, [
      el("span", { className: "report-section-label", text: label }),
      el("p", { className: "report-copy", text: safeText(value) }),
    ]);
  }

  function optionalReportTextBox(label, value) {
    return safeText(value).trim() ? reportTextBox(label, value) : "";
  }

  function renderAssessmentReport() {
    return el("section", { className: "assessment-report" }, [
      el("div", { className: "assessment-topline" }),
      el("div", { className: "assessment-head" }, [
        el("div", {}, [
          el("span", { className: "report-section-label", text: "今回の確認結果にもとづく目安" }),
          el("h2", { text: "建物状態の見える化" }),
        ]),
        el("p", { text: "今回確認できた範囲を、1〜5の目安で整理しています。数字が大きいほど、早めの確認・対応をおすすめする項目です。" }),
      ]),
      el("div", { className: "assessment-layout" }, [
        el("div", { className: "assessment-left" }, [
          renderAssessmentChart(),
          renderAssessmentScaleCards(),
        ]),
        renderAssessmentNoteCards(),
      ]),
      el("div", { className: "assessment-footer-note" }, [
        el("span", { className: "assessment-footer-icon", text: "i" }),
        el("p", {
          text:
            "本レポートは、調査時点で確認できた範囲に基づく目安です。天候や経年変化により、状態が変化する場合があります。詳細な診断やお見積りは、担当者までご相談ください。",
        }),
      ]),
    ]);
  }

  function renderAssessmentProjectInfo() {
    return el("div", { className: "assessment-project-info" }, [
      el("div", { className: "assessment-info-column" }, [
        assessmentInfoItem("お客様名", state.project.clientName, "person"),
        assessmentDateTimeItem(),
      ]),
      el("div", { className: "assessment-info-column" }, [
        assessmentInfoItem("工事名", state.project.workName, "home"),
        assessmentInfoItem("担当者", state.project.inspector, "worker"),
      ]),
    ]);
  }

  function assessmentInfoItem(label, value, icon) {
    return el("div", { className: "assessment-info-item" }, [
      assessmentIcon(icon),
      el("span", { text: label }),
      el("strong", { text: safeText(value) }),
    ]);
  }

  function assessmentDateTimeItem() {
    const dateText = formatDate(state.project.surveyDate);
    const timeText = state.project.surveyTime;
    return el("div", { className: "assessment-info-item assessment-date-item" }, [
      assessmentIcon("calendar"),
      el("span", { text: "調査日時" }),
      el("strong", { className: "assessment-date-value" }, [
        el("span", { text: safeText(dateText) }),
        timeText ? el("span", { text: safeText(timeText) }) : "",
      ]),
    ]);
  }

  function assessmentIcon(type) {
    const paths = {
      person: [
        svgEl("circle", { cx: 18, cy: 13.4, r: 4.6 }),
        svgEl("path", { d: "M9.5 29c2.1-6.4 14.9-6.4 17 0" }),
      ],
      calendar: [
        svgEl("rect", { x: 9, y: 10.5, width: 18, height: 17, rx: 2.2 }),
        svgEl("path", { d: "M13 8v5M23 8v5M9 16h18M13 20h2M18 20h2M23 20h2M13 24h2M18 24h2" }),
      ],
      home: [
        svgEl("path", { d: "M8 17.5 18 9.2l10 8.3" }),
        svgEl("path", { d: "M11 16.8v11.5h14V16.8" }),
        svgEl("path", { d: "M15.5 28.3v-7h5v7" }),
      ],
      worker: [
        svgEl("circle", { cx: 18, cy: 14.4, r: 4.5 }),
        svgEl("path", { d: "M10 29c2-6 14-6 16 0" }),
        svgEl("path", { d: "M12.5 12c1.9-3.5 9.1-3.5 11 0" }),
      ],
      clipboard: [
        svgEl("rect", { x: 10, y: 9, width: 16, height: 20, rx: 2 }),
        svgEl("path", { d: "M14 9c0-3 8-3 8 0M14 15h8M14 20h8M14 25h5" }),
      ],
      alert: [
        svgEl("path", { d: "M18 8.2 28.7 27.4H7.3Z" }),
        svgEl("path", { d: "M18 15.2v6.3" }),
        svgEl("circle", { cx: 18, cy: 24.9, r: 0.8 }),
      ],
      tools: [
        svgEl("path", { d: "M12 8.5h8.5l4 4V28H12Z" }),
        svgEl("path", { d: "M20.5 8.5v4h4" }),
        svgEl("path", { d: "M14.8 21.8 17.5 24.5 23 18" }),
      ],
    };
    return svgEl("svg", { className: "assessment-icon", viewBox: "0 0 36 36", "aria-hidden": "true" }, [
      svgEl("circle", { className: "assessment-icon-bg", cx: 18, cy: 18, r: 17 }),
      ...(paths[type] || paths.clipboard),
    ]);
  }

  function renderAssessmentNoteCards() {
    return el("div", { className: "assessment-notes" }, [
      assessmentNoteCard("総合目安", state.assessment.overall, "clipboard"),
      assessmentNoteCard("緊急性", state.assessment.urgency, "alert"),
      assessmentNoteCard("おすすめの方向性", state.assessment.policy, "tools"),
    ]);
  }

  function assessmentNoteCard(label, value, icon) {
    return el("div", { className: "assessment-note-card" }, [
      el("div", { className: "assessment-note-title" }, [
        assessmentIcon(icon),
        el("h3", { text: label }),
      ]),
      el("p", { text: safeText(value) }),
    ]);
  }

  function renderAssessmentChart() {
    const items = state.assessment.items;
    const centerX = 180;
    const centerY = 162;
    const maxRadius = 100;
    const labelRadius = 143;
    const points = items.map((item, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / items.length;
      const numericValue = item.value === "" || item.value == null ? 0 : Math.max(1, Math.min(5, Number(item.value) || 0));
      const radius = (numericValue / 5) * maxRadius;
      const labelX = Math.max(44, Math.min(316, centerX + Math.cos(angle) * labelRadius));
      const labelY = Math.max(24, Math.min(320, centerY + Math.sin(angle) * labelRadius));
      return {
        item,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        labelX,
        labelY,
        axisX: centerX + Math.cos(angle) * maxRadius,
        axisY: centerY + Math.sin(angle) * maxRadius,
      };
    });
    const gridPolygons = [1, 2, 3, 4, 5].map((level) => {
      const radius = (level / 5) * maxRadius;
      return items
        .map((_, index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / items.length;
          return `${centerX + Math.cos(angle) * radius},${centerY + Math.sin(angle) * radius}`;
        })
        .join(" ");
    });

    return el("div", { className: "assessment-chart-wrap" }, [
      svgEl(
        "svg",
        { className: "assessment-chart", viewBox: "0 0 360 330", role: "img", "aria-label": "今回の確認結果にもとづく目安" },
        [
          ...gridPolygons.map((polygon) => svgEl("polygon", { points: polygon, className: "radar-grid" })),
          ...points.map((point) => svgEl("line", { x1: centerX, y1: centerY, x2: point.axisX, y2: point.axisY, className: "radar-axis" })),
          svgEl("polygon", { points: points.map((point) => `${point.x},${point.y}`).join(" "), className: "radar-area" }),
          ...points.map((point) => svgEl("circle", { cx: point.x, cy: point.y, r: 4.8, className: "radar-point" })),
          ...points.flatMap((point, index) => [
            svgEl("circle", { cx: point.labelX, cy: point.labelY - 16, r: 9.6, className: "radar-number-bg" }),
            svgEl(
              "text",
              {
                x: point.labelX,
                y: point.labelY - 16,
                className: "radar-number",
                "text-anchor": "middle",
                "dominant-baseline": "central",
              },
              [String(index + 1)],
            ),
            svgEl(
              "text",
              { x: point.labelX, y: point.labelY + 5, className: "radar-label", "text-anchor": "middle" },
              assessmentChartLabelLines(point.item.label).map((line, lineIndex) =>
                svgEl("tspan", { x: point.labelX, dy: lineIndex === 0 ? 0 : 15 }, [line]),
              ),
            ),
          ]),
        ],
      ),
    ]);
  }

  function renderAssessmentScaleCards() {
    return el(
      "div",
      { className: "assessment-scale" },
      state.assessment.items.map((item, index) =>
        el("div", { className: "assessment-scale-card" }, [
          el("div", { className: "assessment-scale-head" }, [
            el("div", { className: "assessment-scale-title" }, [
              el("b", { text: String(index + 1) }),
              el("span", { text: item.label }),
            ]),
            el("em", { text: item.value ? `目安${item.value}` : "" }),
          ]),
          el("strong", { text: assessmentLevelLabel(String(item.value)) || "" }),
        ]),
      ),
    );
  }

  function timelineItem(label, text) {
    return el("div", { className: "timeline-item" }, [
      el("div", { className: "timeline-copy" }, [
        el("span", { className: "report-section-label", text: label }),
        el("p", { text }),
      ]),
    ]);
  }

  function priorityBadge(value) {
    if (!value) return "";
    const option = priorities.find((item) => item.value === value) || priorities[1];
    return el("span", { className: `priority ${option.value}`, text: option.short });
  }

  function priorityLabel(value) {
    const option = priorities.find((item) => item.value === value);
    return option ? option.label : value;
  }

  function assessmentLevelLabel(value) {
    return {
      1: "軽度",
      2: "やや注意",
      3: "注意",
      4: "早めに対処",
      5: "優先対応",
    }[String(value)] || value;
  }

  function assessmentChartLabelLines(label) {
    const lineMap = {
      "劣化・損傷の程度": ["劣化・損傷", "の程度"],
      "維持管理上の注意度": ["維持管理上", "の注意度"],
    };
    return lineMap[label] || [label];
  }

  function button(text, className, onclick, disabled = false) {
    const props = { className, type: "button", onclick, text };
    if (disabled) props.disabled = "disabled";
    return el("button", props);
  }

  function companyDisplayName(company = state.company) {
    return safeText(company?.name || company?.brandName).trim();
  }

  function normalizeCompanySettings(company) {
    const normalized = clone(defaultState.company);
    COMPANY_SETTINGS_FIELDS.forEach((key) => {
      normalized[key] = safeText(company?.[key]);
    });
    normalized.services = normalizeCompanyContact(normalized.services || company?.contact);
    normalized.contact = normalized.services;
    normalized.companyInfoChangedAt = "";
    return normalized;
  }

  function hasCompanyInformation(company) {
    return COMPANY_SETTINGS_FIELDS.some((key) => safeText(company?.[key]).trim());
  }

  function loadCompanySettings() {
    try {
      const raw = localStorage.getItem(COMPANY_SETTINGS_KEY);
      if (!raw) return null;
      const stored = JSON.parse(raw);
      const company = stored?.company || stored;
      if (!company || typeof company !== "object" || Array.isArray(company)) return null;
      return normalizeCompanySettings(company);
    } catch (error) {
      console.warn("Company settings could not be loaded", error);
      return null;
    }
  }

  function saveCompanySettings() {
    try {
      const company = normalizeCompanySettings(state.company);
      localStorage.setItem(
        COMPANY_SETTINGS_KEY,
        JSON.stringify({
          version: 1,
          savedAt: new Date().toISOString(),
          company,
        }),
      );
      showToast("会社情報を保存しました。次回以降の報告書にも使用されます。", 4200);
      return true;
    } catch (error) {
      console.error("Company settings could not be saved", error);
      window.alert(
        "会社情報を保存できませんでした。\nロゴ画像の容量を確認して、もう一度お試しください。",
      );
      return false;
    }
  }

  function updateCompany(key, value) {
    const nextValue = safeText(value);
    if (state.company[key] === nextValue) return;
    state.company[key] = nextValue;
    if (key === "services") state.company.contact = nextValue;
    state.company.companyInfoChangedAt = new Date().toISOString();
    companyInfoChangePending = true;
    syncPrintFooterStyle();
    saveState();
  }

  async function handleCompanyLogo(event, slot = 1) {
    const file = event.target.files && event.target.files[0];
    const dataKey = slot === 1 ? "logoDataUrl" : "logo2DataUrl";
    const nameKey = slot === 1 ? "logoName" : "logo2Name";
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      window.alert("画像ファイルを選択してください。");
      return;
    }
    try {
      setSaveStatus("保存中", `会社ロゴ${slot}を登録しています`);
      state.company[dataKey] = await resizeLogoImage(file);
      state.company[nameKey] = file.name;
      state.company.companyInfoChangedAt = new Date().toISOString();
      companyInfoChangePending = true;
      saveState();
      render();
      showToast(`会社ロゴ${slot}を登録しました`);
    } catch (error) {
      console.error("Company logo registration failed", error);
      setSaveStatus("保存に失敗しました", "会社ロゴを登録できませんでした", true);
      window.alert("会社ロゴを登録できませんでした。別の画像でお試しください。");
    }
  }

  function removeCompanyLogo(slot = 1) {
    const dataKey = slot === 1 ? "logoDataUrl" : "logo2DataUrl";
    const nameKey = slot === 1 ? "logoName" : "logo2Name";
    if (!state.company[dataKey]) return;
    if (
      !window.confirm(
        `登録済みの会社ロゴ${slot}を削除しますか？\n削除すると、報告書の最終ページにはロゴ${slot}が表示されなくなります。`,
      )
    ) {
      return;
    }
    state.company[dataKey] = "";
    state.company[nameKey] = "";
    state.company.companyInfoChangedAt = new Date().toISOString();
    companyInfoChangePending = true;
    saveState();
    render();
    showToast(`会社ロゴ${slot}を削除しました`);
  }

  function resizeLogoImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        const maxWidth = 640;
        const maxHeight = 256;
        const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas is not available"));
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        URL.revokeObjectURL(url);
        try {
          resolve(canvas.toDataURL("image/webp", 0.92));
        } catch (error) {
          reject(error);
        }
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Logo image load failed"));
      };
      image.src = url;
    });
  }

  function syncPrintFooterStyle() {
    const styleId = "dynamic-print-footer-style";
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    const companyName = companyDisplayName();
    const prefix = companyName ? `${companyName}｜` : "";
    const content = `${prefix}建物調査報告書｜`;
    const escapedContent = content.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ");
    style.textContent =
      `@media print { @page { @bottom-center { content: "${escapedContent}" counter(page); ` +
      "color: #666; font-size: 9pt; } } }";
  }

  function update(path, value) {
    const keys = path.split(".");
    let target = state;
    keys.slice(0, -1).forEach((key) => {
      target = target[key];
    });
    target[keys[keys.length - 1]] = value;
    saveState();
  }

  function patchFinding(id, key, value) {
    const target = state.findings.find((item) => item.id === id);
    if (!target) return;
    target[key] = value;
    saveState();
  }

  function patchPhoto(id, key, value) {
    const target = state.photos.find((item) => item.id === id);
    if (!target) return;
    target[key] = value;
    saveState();
  }

  function patchAssessmentItem(id, value) {
    const item = state.assessment.items.find((entry) => entry.id === id);
    if (!item) return;
    item.value = value === "" || value == null ? "" : Math.max(1, Math.min(5, Number(value) || 1));
    saveState();
  }

  function patchAssessmentDisplayText(id, value) {
    const item = state.assessment.items.find((entry) => entry.id === id);
    if (!item) return;
    item.displayText = safeText(value);
    saveState();
  }

  function openAiReplyImportDialog(targetType, targetId) {
    const titleMap = {
      photo: "写真カードへAI回答を貼り戻す",
      finding: "確認項目へAI回答を貼り戻す",
      assessment: "目安へAI回答を貼り戻す",
      proposal: "施工方針へAI回答を貼り戻す",
      summary: "全体まとめへAI回答を貼り戻す",
    };
    const textarea = el("textarea", {
      className: "ai-reply-import-textarea",
      placeholder:
        "外部AIから返ってきた回答全文をここに貼り付けてください。\n【現在の状態】などの見出しを読み取り、反映前に内容を確認できます。",
    });
    const preview = el("div", { className: "ai-reply-import-preview" });
    let currentEntries = [];

    const syncPreview = () => {
      currentEntries = collectAiReplyImportEntries(textarea.value, targetType, targetId);
      const status = getAiReplyImportStatus(currentEntries, targetType);
      preview.replaceChildren(
        currentEntries.length
          ? el("div", { className: "ai-reply-preview-list" }, [
              el("div", { className: "ai-reply-preview-summary" }, [
                el("strong", { text: "読み取り結果" }),
                el("p", { text: `読み取れた項目：${status.found.join("、") || "なし"}` }),
                status.missing.length ? el("p", { text: `未検出の項目：${status.missing.join("、")}` }) : "",
              ]),
              ...currentEntries.map((entry) =>
                el("div", { className: "ai-reply-preview-item" }, [
                  el("strong", { text: entry.label }),
                  el("p", { text: entry.next }),
                ]),
              ),
            ])
          : el("p", {
              className: "ai-reply-import-empty",
              text: "読み取れる見出しがまだありません。AI回答を貼り付けると、ここに反映候補が表示されます。",
            }),
      );
      autoResizeTextarea(textarea);
    };

    textarea.addEventListener("input", syncPreview);
    const overlay = el("div", { className: "confirm-screen" }, [
      el("div", { className: "confirm-dialog ai-reply-import-dialog" }, [
        el("h2", { text: titleMap[targetType] || "AI回答を貼り戻す" }),
        el("p", {
          text:
            "AI回答は下書きです。反映前に内容を確認し、必要に応じて担当者が修正してください。",
        }),
        textarea,
        preview,
        el("div", { className: "confirm-actions" }, [
          button("キャンセル", "btn", () => overlay.remove()),
          button("反映する", "btn primary", () => {
            currentEntries = collectAiReplyImportEntries(textarea.value, targetType, targetId);
            if (!currentEntries.length) {
              window.alert("反映できる見出しが見つかりませんでした。AI回答の見出しを確認してください。");
              return;
            }
            const status = getAiReplyImportStatus(currentEntries, targetType);
            if (
              status.missing.length > 0 &&
              !window.confirm(`読み取れなかった項目があります。\n\n未検出：${status.missing.join("、")}\n\n反映できる項目だけ反映しますか？`)
            ) {
              return;
            }
            const overwriteCount = currentEntries.filter((entry) => !isBlank(entry.current) && safeText(entry.current).trim() !== safeText(entry.next).trim()).length;
            if (
              overwriteCount > 0 &&
              !window.confirm(`既存の入力内容がある欄が${overwriteCount}件あります。上書きして反映しますか？`)
            ) {
              return;
            }
            currentEntries.forEach((entry) => entry.apply());
            saveState();
            overlay.remove();
            render();
            showToast("AI回答を反映しました。内容を確認してからご使用ください。", 3600);
          }),
        ]),
      ]),
    ]);
    document.body.appendChild(overlay);
    syncPreview();
    textarea.focus();
  }

  function getAiReplyImportStatus(entries, targetType) {
    const expected = {
      photo: [
        "写真タイトル",
        "撮影箇所",
        "調査結果の目安",
        "現在の状態",
        "この箇所の対応目安",
      ],
      finding: [
        "確認した内容",
        "考えられること・注意点",
        "対応の考え方",
      ],
      assessment: [
        "総合目安",
        "緊急性について",
        "おすすめの方向性",
        "緊急性",
        "安全性",
        "使用上の支障",
        "劣化・損傷の程度",
        "建物への影響",
        "維持管理上の注意度",
      ],
      proposal: [
        "ご提案内容",
        "おすすめする施工方針",
        "主な工事内容",
        "あわせておすすめしたい対策",
        "工事中に確認が必要なこと",
        "今後注意しておきたい点",
        "最後にお伝えしたいこと",
      ],
      summary: ["全体のまとめ"],
    }[targetType] || [];
    const found = new Set(
      entries.map((entry) => safeText(entry.label).split("：")[0].trim()).filter(Boolean),
    );
    return {
      found: expected.filter((label) => found.has(label)),
      missing: expected.filter((label) => !found.has(label)),
    };
  }

  function collectAiReplyImportEntries(text, targetType, targetId) {
    const sections = parseAiReplySections(text);
    const entries = [];
    if (targetType === "photo") {
      const photo = state.photos.find((item) => item.id === targetId);
      if (!photo) return entries;
      addAiReplyField(entries, sections, ["写真タイトル"], "写真タイトル", photo.title, (value) => { photo.title = value; });
      addAiReplyField(entries, sections, ["撮影箇所"], "撮影箇所", photo.area, (value) => { photo.area = value; });
      addAiReplyField(entries, sections, ["調査結果の目安"], "調査結果の目安", photo.condition, (value) => { photo.condition = value; });
      addAiReplyField(entries, sections, ["現在の状態"], "現在の状態", photo.finding || photo.memo, (value) => { photo.finding = value; });
      addAiReplyField(entries, sections, ["この箇所の対応目安"], "この箇所の対応目安", photo.recommendation, (value) => { photo.recommendation = value; });
    } else if (targetType === "finding") {
      const finding = state.findings.find((item) => item.id === targetId);
      if (!finding) return entries;
      addAiReplyField(entries, sections, ["確認した内容"], "確認した内容", finding.observation, (value) => { finding.observation = value; });
      addAiReplyField(entries, sections, ["考えられること・注意点"], "考えられること・注意点", finding.concern, (value) => { finding.concern = value; });
      addAiReplyField(entries, sections, ["対応の考え方"], "対応の考え方", finding.proposal, (value) => { finding.proposal = value; });
    } else if (targetType === "assessment") {
      addAssessmentSummaryAiReplyEntries(entries, sections);
      addAssessmentAiReplyEntries(entries, sections);
    } else if (targetType === "proposal") {
      addAiReplyField(entries, sections, ["ご提案内容"], "ご提案内容", state.proposal.planName, (value) => { state.proposal.planName = value; });
      addAiReplyField(entries, sections, ["おすすめする施工方針"], "おすすめする施工方針", state.summary.recommendation, (value) => { state.summary.recommendation = value; });
      addAiReplyField(entries, sections, ["主な工事内容"], "主な工事内容", state.proposal.scope, (value) => { state.proposal.scope = value; });
      addAiReplyField(entries, sections, ["あわせておすすめしたい対策"], "あわせておすすめしたい対策", state.summary.additionalRecommendations, (value) => { state.summary.additionalRecommendations = value; });
      addAiReplyField(entries, sections, ["工事中に確認が必要なこと"], "工事中に確認が必要なこと", state.proposal.cautions, (value) => { state.proposal.cautions = value; });
      addAiReplyField(entries, sections, ["今後注意しておきたい点"], "今後注意しておきたい点", state.proposal.watchPoint, (value) => { state.proposal.watchPoint = value; });
      addAiReplyField(entries, sections, ["最後にお伝えしたいこと"], "最後にお伝えしたいこと", state.proposal.closing, (value) => { state.proposal.closing = value; });
    } else if (targetType === "summary") {
      addAiReplyField(entries, sections, ["全体のまとめ", "現在の全体まとめ"], "全体のまとめ", state.summary.overall, (value) => { state.summary.overall = value; });
    }
    return entries;
  }

  function addAiReplyField(entries, sections, headings, label, current, apply) {
    const next = readAiReplySection(sections, headings);
    if (isBlank(next)) return;
    entries.push({ label, current: safeText(current), next, apply: () => apply(next) });
  }

  function addAssessmentSummaryAiReplyEntries(entries, sections) {
    addAiReplyField(entries, sections, ["総合目安"], "総合目安", state.assessment.overall, (value) => {
      state.assessment.overall = value;
    });
    addAiReplyField(entries, sections, ["緊急性について"], "緊急性について", state.assessment.urgency, (value) => {
      state.assessment.urgency = value;
    });
    addAiReplyField(entries, sections, ["おすすめの方向性"], "おすすめの方向性", state.assessment.policy, (value) => {
      state.assessment.policy = value;
    });
  }

  function addAssessmentAiReplyEntries(entries, sections) {
    assessmentAiHeadings.forEach((base) => {
      const item = state.assessment.items.find((entry) => entry.id === base.id);
      if (!item) return;
      const raw = readAiReplySection(sections, [`目安：${base.label}`, `目安:${base.label}`]);
      if (isBlank(raw)) return;
      const parsed = parseAssessmentAiReply(raw);
      if (parsed.value) {
        entries.push({
          label: `${base.label}：程度`,
          current: item.value ? `目安${item.value}` : "",
          next: `目安${parsed.value}`,
          apply: () => { item.value = Number(parsed.value); },
        });
      }
    });
  }

  function parseAiReplySections(text) {
    const sections = {};
    const source = safeText(text).replace(/\r\n?/g, "\n");
    const headingPattern = /(?:^|\n)\s*(?:[【\[]\s*([^】\]\n]+?)\s*[】\]]|■\s*([^\n：:]{2,40})\s*|([^【\[\]■\n：:]{2,40})\s*[：:]\s*(?=\n|$))/g;
    const matches = [...source.matchAll(headingPattern)];
    matches.forEach((match, index) => {
      const start = match.index + match[0].length;
      const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
      const key = normalizeAiReplyHeading(match[1] || match[2] || match[3]);
      const value = cleanAiReplyValue(source.slice(start, end));
      if (key && value) sections[key] = value;
    });
    source.split("\n").forEach((line) => {
      const match = line.match(/^\s*([^：:]{2,30})\s*[：:]\s*(.+)$/);
      if (!match) return;
      const key = normalizeAiReplyHeading(match[1]);
      if (!sections[key]) sections[key] = cleanAiReplyValue(match[2]);
    });
    return sections;
  }

  function readAiReplySection(sections, headings) {
    for (const heading of headings) {
      const value = sections[normalizeAiReplyHeading(heading)];
      if (!isBlank(value)) return value;
    }
    return "";
  }

  function normalizeAiReplyHeading(value) {
    return safeText(value)
      .replace(/[ \t　]/g, "")
      .replace(/^[■◆●・]+/g, "")
      .replace(/[：:]+$/g, "");
  }

  function cleanAiReplyValue(value) {
    return safeText(value)
      .replace(/^\s*本文\s*$/gm, "")
      .replace(/^```[a-zA-Z]*\s*/g, "")
      .replace(/```\s*$/g, "")
      .trim();
  }

  function parseAssessmentAiReply(value) {
    const text = cleanAiReplyValue(value);
    const valueMatch =
      text.match(/目安\s*([1-5])/) ||
      text.match(/程度\s*[：:]?\s*([1-5])/) ||
      text.match(/^([1-5])\s*[：:]/);
    const level = valueMatch ? valueMatch[1] : "";
    const displayLine = text.match(/表示文\s*[：:]\s*(.+)/);
    let displayText = displayLine
      ? displayLine[1].trim()
      : text
          .replace(/^.*程度\s*[：:].*$/gm, "")
          .replace(/^.*目安\s*[1-5].*$/gm, "")
          .replace(/目安\s*[1-5]\s*[：:、,\-－ー]?\s*/g, "")
          .replace(/程度\s*[：:]?\s*[1-5]\s*[：:、,\-－ー]?\s*/g, "")
          .replace(/表示文\s*[：:]\s*/g, "")
          .trim();
    displayText = displayText.split("\n").map((line) => line.trim()).filter(Boolean)[0] || "";
    return { value: level, displayText };
  }

  function priorityValueFromText(value) {
    const text = safeText(value);
    const found = priorities.find((item) => text.includes(item.label) || text.includes(item.short));
    return found?.value || "";
  }

  function applyProcessDiagramTemplate(templateId) {
    const template = processDiagramTemplates.find((entry) => entry.id === templateId);
    if (!template) return false;
    if (
      hasProcessDiagramContent(state.processDiagram) &&
      !window.confirm("現在入力されている工程があります。テンプレートを適用すると内容が置き換わります。適用しますか？")
    ) {
      render();
      return false;
    }
    const enabled = Boolean(state.processDiagram.enabled);
    state.processDiagram = {
      enabled,
      templateId,
      ...clone(template.diagram),
    };
    saveState();
    render();
    return true;
  }

  function addProcessDiagramStep() {
    const stepCount = state.processDiagram.items.filter((item) => item.type === "step").length;
    state.processDiagram.items.push({
      id: createId(),
      type: "step",
      number: String(stepCount + 1),
      title: "",
      note: "",
      variant: "normal",
    });
    state.processDiagram.templateId = "free";
    saveState();
    render();
  }

  function addProcessDiagramDivider() {
    state.processDiagram.items.push({
      id: createId(),
      type: "divider",
      text: "",
      variant: "branch",
    });
    state.processDiagram.templateId = "free";
    saveState();
    render();
  }

  function patchProcessDiagramItem(id, key, value) {
    const item = state.processDiagram.items.find((entry) => entry.id === id);
    if (!item) return;
    item[key] = value;
    state.processDiagram.templateId = "free";
    saveState();
  }

  function patchProcessDiagramField(key, value) {
    state.processDiagram[key] = value;
    state.processDiagram.templateId = "free";
    saveState();
  }

  function moveProcessDiagramItem(index, direction) {
    const items = state.processDiagram.items;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const item = items[index];
    items[index] = items[nextIndex];
    items[nextIndex] = item;
    state.processDiagram.templateId = "free";
    saveState();
    render();
  }

  function deleteProcessDiagramItem(id) {
    state.processDiagram.items = state.processDiagram.items.filter((item) => item.id !== id);
    state.processDiagram.templateId = "free";
    saveState();
    render();
  }

  function moveItem(collectionKey, index, direction) {
    const list = state[collectionKey];
    if (!Array.isArray(list)) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= list.length) return;
    const item = list[index];
    list[index] = list[nextIndex];
    list[nextIndex] = item;
    saveState();
    render();
  }

  function handlePhotos(files) {
    Array.from(files || []).forEach(async (file) => {
      if (!file.type.startsWith("image/")) return;
      try {
        setSaveStatus("保存中", "写真を圧縮しています");
        const photoId = createId();
        const blob = await resizeImage(file);
        await putPhotoBlob(photoId, blob);
        state.photos.push({
          id: photoId,
          photoId,
          src: URL.createObjectURL(blob),
          fileName: `${photoId}.jpg`,
          mimeType: blob.type || "image/jpeg",
          title: "",
          area: "",
          condition: "",
          findingId: "",
          finding: "",
          recommendation: "",
          memo: "",
          annotations: [],
        });
        saveState();
        render();
      } catch (error) {
        setSaveStatus("保存に失敗しました", "写真を保存できませんでした", true);
        window.alert("写真を保存できませんでした。別の画像でお試しください。");
      }
    });
  }

  async function createAiConsultationImage(photoId) {
    const photo = state.photos.find((item) => item.id === photoId);
    if (!photo || !photo.src) {
      showToast("相談用画像を作成できる写真がありません。");
      return;
    }

    try {
      showToast("AI相談用画像を作成しています。");
      const blob = await buildAiConsultationImage(photo);
      if (await copyImageBlobToClipboard(blob)) {
        showToast("AI相談用画像をコピーしました。AIの回答は参考です。最終判断は担当者が確認してください。", 4200);
        return;
      }
      downloadAiConsultationImage(blob, photo);
      showToast("AI相談用画像を作成しました。AIの回答は参考です。最終判断は担当者が確認してください。", 4200);
    } catch (error) {
      console.error("AI consultation image creation failed", error);
      window.alert("AI相談用画像を作成できませんでした。写真を読み込み直してからお試しください。");
    }
  }

  async function buildAiConsultationImage(photo) {
    const image = await loadCanvasImage(photo.src);
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 100;
    let ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available");
    ctx.font = '500 22px "Yu Gothic", "Meiryo", sans-serif';
    const promptLines = canvasWrappedLines(ctx, AI_PHOTO_PROMPT, 1424);
    const promptHeight = 108 + Math.max(1, promptLines.length) * 34;
    const photoY = 132 + promptHeight + 30;
    const photoHeight = 500;
    const longFieldY = photoY + photoHeight + 30;
    const longFieldHeight = 420;
    canvas.height = longFieldY + longFieldHeight + 42;
    ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available");

    ctx.fillStyle = "#f7f4f3";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#8b1e24";
    ctx.fillRect(0, 0, canvas.width, 18);

    drawCanvasText(ctx, "AI相談用 現場写真カード", 58, 62, {
      font: '700 34px "Yu Gothic", "Meiryo", sans-serif',
      color: "#7a171d",
    });
    const meta = [
      safeText(state.project.clientName).trim(),
      safeText(state.project.workName).trim(),
      formatDate(state.project.surveyDate),
    ]
      .filter(Boolean)
      .join(" / ");
    drawCanvasText(ctx, meta || "建物調査報告書", 58, 103, {
      font: '500 20px "Yu Gothic", "Meiryo", sans-serif',
      color: "#62666a",
      maxWidth: 1484,
    });

    drawAiPromptCard(
      ctx,
      "AI相談用プロンプト",
      AI_PHOTO_PROMPT,
      58,
      132,
      1484,
      promptHeight,
      promptLines.length,
    );

    const photoRect = { x: 58, y: photoY, width: 900, height: photoHeight };
    drawRoundedPanel(ctx, photoRect.x, photoRect.y, photoRect.width, photoRect.height, 18, "#ffffff", "#d7c9c7");
    const imageRect = drawContainedCanvasImage(ctx, image, photoRect.x, photoRect.y, photoRect.width, photoRect.height, 18);
    drawCanvasAnnotations(ctx, photo.annotations, imageRect);

    const infoRect = { x: 988, y: photoY, width: 554, height: photoHeight };
    drawRoundedPanel(ctx, infoRect.x, infoRect.y, infoRect.width, infoRect.height, 18, "#ffffff", "#d7c9c7");
    let infoY = infoRect.y + 52;
    infoY = drawAiConsultationField(ctx, "写真タイトル", photo.title, infoRect.x + 34, infoY, infoRect.width - 68, 2);
    infoY += 12;
    drawCanvasRule(ctx, infoRect.x + 34, infoY, infoRect.x + infoRect.width - 34, "#ead8d6");
    infoY += 32;
    infoY = drawAiConsultationField(
      ctx,
      "撮影箇所",
      aiConsultationValue(photo.area),
      infoRect.x + 34,
      infoY,
      infoRect.width - 68,
      2,
    );
    infoY += 12;
    drawCanvasRule(ctx, infoRect.x + 34, infoY, infoRect.x + infoRect.width - 34, "#ead8d6");
    infoY += 32;
    drawAiConsultationField(
      ctx,
      "調査結果の目安",
      aiConsultationValue(photo.condition),
      infoRect.x + 34,
      infoY,
      infoRect.width - 68,
      3,
    );

    drawAiConsultationLongField(
      ctx,
      "現在の状態",
      photo.finding || photo.memo,
      58,
      longFieldY,
      728,
      longFieldHeight,
    );
    drawAiConsultationLongField(
      ctx,
      "この箇所の対応目安",
      photo.recommendation,
      814,
      longFieldY,
      728,
      longFieldHeight,
    );

    return canvasToPngBlob(canvas);
  }

  function loadCanvasImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Photo load failed"));
      image.src = src;
    });
  }

  function drawContainedCanvasImage(ctx, image, x, y, width, height, radius) {
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (height - drawHeight) / 2;
    ctx.save();
    roundedCanvasPath(ctx, x, y, width, height, radius);
    ctx.clip();
    ctx.fillStyle = "#ece9e8";
    ctx.fillRect(x, y, width, height);
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();
    return { x: drawX, y: drawY, width: drawWidth, height: drawHeight };
  }

  function drawCanvasAnnotations(ctx, annotations, rect) {
    normalizeAnnotations(annotations).forEach((annotation) => {
      const redWidth = 10;
      const outlineWidth = 18;
      const strokeColor = annotation.strokeColor || "#c5222d";
      const outlineColor = annotation.outlineColor || "#ffffff";
      if (annotation.type === "circle") {
        const cx = rect.x + annotation.cx * rect.width;
        const cy = rect.y + annotation.cy * rect.height;
        const rx = annotation.rx * rect.width;
        const ry = annotation.ry * rect.height;
        [outlineColor, strokeColor].forEach((color, index) => {
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.fillStyle = "transparent";
          ctx.strokeStyle = color;
          ctx.lineWidth = index === 0 ? outlineWidth : redWidth;
          ctx.stroke();
        });
        return;
      }

      const x1 = rect.x + annotation.x1 * rect.width;
      const y1 = rect.y + annotation.y1 * rect.height;
      const x2 = rect.x + annotation.x2 * rect.width;
      const y2 = rect.y + annotation.y2 * rect.height;
      drawCanvasArrow(ctx, x1, y1, x2, y2, outlineColor, outlineWidth, 58);
      drawCanvasArrow(ctx, x1, y1, x2, y2, strokeColor, redWidth, 48);
    });
  }

  function drawCanvasArrow(ctx, x1, y1, x2, y2, color, lineWidth, headSize) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const baseX = x2 - ux * headSize;
    const baseY = y2 - uy * headSize;
    const halfWidth = headSize * 0.42;
    const shaftEndX = x2 - ux * headSize * 0.68;
    const shaftEndY = y2 - uy * headSize * 0.68;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(shaftEndX, shaftEndY);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(baseX - uy * halfWidth, baseY + ux * halfWidth);
    ctx.lineTo(baseX + uy * halfWidth, baseY - ux * halfWidth);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawAiPromptCard(ctx, heading, prompt, x, y, width, height, maxLines = 20) {
    drawRoundedPanel(ctx, x, y, width, height, 18, "#fff8f7", "#d9aaa6");
    drawCanvasText(ctx, heading, x + 30, y + 48, {
      font: '700 24px "Yu Gothic", "Meiryo", sans-serif',
      color: "#8b1e24",
    });
    drawCanvasRule(ctx, x + 30, y + 70, x + width - 30, "#d9aaa6");
    drawCanvasWrappedText(ctx, prompt, x + 30, y + 106, width - 60, 34, maxLines, {
      font: '500 22px "Yu Gothic", "Meiryo", sans-serif',
      color: "#303235",
    });
  }

  function drawAiConsultationField(ctx, label, value, x, y, width, maxLines) {
    drawCanvasText(ctx, label, x, y, {
      font: '700 21px "Yu Gothic", "Meiryo", sans-serif',
      color: "#8b1e24",
    });
    return drawCanvasWrappedText(ctx, value || "未入力", x, y + 38, width, 34, maxLines, {
      font: '700 27px "Yu Gothic", "Meiryo", sans-serif',
      color: value ? "#24272a" : "#9a9697",
    });
  }

  function drawAiConsultationLongField(ctx, label, value, x, y, width, height) {
    drawRoundedPanel(ctx, x, y, width, height, 18, "#ffffff", "#d7c9c7");
    drawCanvasText(ctx, label, x + 30, y + 48, {
      font: '700 24px "Yu Gothic", "Meiryo", sans-serif',
      color: "#8b1e24",
    });
    drawCanvasRule(ctx, x + 30, y + 72, x + width - 30, "#d9aaa6");
    drawCanvasWrappedText(ctx, value || "未入力", x + 30, y + 118, width - 60, 39, 7, {
      font: '500 27px "Yu Gothic", "Meiryo", sans-serif',
      color: value ? "#303235" : "#9a9697",
    });
  }

  function drawRoundedPanel(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.save();
    roundedCanvasPath(ctx, x, y, width, height, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function roundedCanvasPath(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawCanvasRule(ctx, x1, y, x2, color) {
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawCanvasText(ctx, text, x, y, options = {}) {
    ctx.save();
    ctx.font = options.font || '500 24px "Yu Gothic", "Meiryo", sans-serif';
    ctx.fillStyle = options.color || "#24272a";
    ctx.textAlign = options.align || "left";
    ctx.textBaseline = "alphabetic";
    if (options.maxWidth) ctx.fillText(safeText(text), x, y, options.maxWidth);
    else ctx.fillText(safeText(text), x, y);
    ctx.restore();
  }

  function drawCanvasWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines, options = {}) {
    ctx.save();
    ctx.font = options.font || '500 24px "Yu Gothic", "Meiryo", sans-serif';
    ctx.fillStyle = options.color || "#24272a";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const lines = canvasWrappedLines(ctx, text, maxWidth);
    const visibleLines = lines.slice(0, maxLines);
    if (lines.length > maxLines && visibleLines.length) {
      let last = visibleLines[visibleLines.length - 1];
      while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
      visibleLines[visibleLines.length - 1] = `${last}…`;
    }
    visibleLines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
    ctx.restore();
    return y + visibleLines.length * lineHeight;
  }

  function canvasWrappedLines(ctx, text, maxWidth) {
    const lines = [];
    safeText(text)
      .split(/\r?\n/)
      .forEach((paragraph) => {
        if (!paragraph) {
          lines.push("");
          return;
        }
        let line = "";
        Array.from(paragraph).forEach((character) => {
          const candidate = line + character;
          if (line && ctx.measureText(candidate).width > maxWidth) {
            lines.push(line);
            line = character;
          } else {
            line = candidate;
          }
        });
        if (line) lines.push(line);
      });
    if (!lines.length) lines.push("");
    return lines;
  }

  function aiConsultationValue(value) {
    const text = safeText(value).trim();
    return !text || text === "その他" ? "" : text;
  }

  function canvasToPngBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("PNG creation failed"));
      }, "image/png");
    });
  }

  async function copyImageBlobToClipboard(blob) {
    if (!navigator.clipboard?.write || typeof window.ClipboardItem !== "function") return false;
    try {
      await navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })]);
      return true;
    } catch (error) {
      return false;
    }
  }

  function downloadAiConsultationImage(blob, photo) {
    const fileBase = safeText(photo.title || photo.area || "現場写真")
      .replace(/[\\/:*?"<>|]/g, "_")
      .slice(0, 40);
    downloadBlobAs(blob, `AI相談用画像_${fileBase || "現場写真"}.png`);
  }

  function downloadBlobAs(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function buildPhotoAiConsultationPrompt(photo) {
    return (
      `【AI相談用プロンプト】\n\n${AI_PHOTO_PROMPT}\n\n` +
      "【現在の入力内容】\n" +
      `【写真タイトル】\n${safeText(photo.title).trim() || "未入力"}\n\n` +
      `【撮影箇所】\n${aiConsultationValue(photo.area) || "未入力"}\n\n` +
      `【調査結果の目安】\n${aiConsultationValue(photo.condition) || "未入力"}\n\n` +
      `【現在の状態】\n${safeText(photo.finding || photo.memo).trim() || "未入力"}\n\n` +
      `【この箇所の対応目安】\n${safeText(photo.recommendation).trim() || "未入力"}`
    );
  }

  async function copyAiConsultationPrompt(photoId) {
    const photo = state.photos.find((item) => item.id === photoId);
    if (!photo) return;
    const prompt = buildPhotoAiConsultationPrompt(photo);
    const copied = await copyPlainText(prompt);
    if (copied) {
      showToast("相談文をコピーしました。AIの回答は参考です。最終判断は担当者が確認してください。", 4200);
    } else {
      window.alert(`相談文をコピーできませんでした。\n\n${prompt}`);
    }
  }

  function buildFindingAiConsultationPrompt(finding) {
    const valueOrBlank = (value) => safeText(value).trim() || "未入力";
    const area = aiConsultationValue(finding.area) || "未入力";
    const condition = aiConsultationValue(finding.condition) || "未入力";
    const priority = priorityLabel(finding.priority) || "未入力";
    return (
      "【AI相談用プロンプト】\n\n" +
      "これはアプリ機能の一つです。作成した文章は、建物調査報告書メーカーの各入力欄へコピーして使用します。前置きや感想、余計な補足説明はできるだけ省き、そのまま貼り付けやすい形で回答してください。\n\n" +
      "この相談文の目的は、新しく診断することではありません。担当者が入力した内容をもとに、一般のお客様にも伝わる自然な文章へ整えることです。\n\n" +
      AI_WRITING_GUIDANCE +
      "\n\n" +
      "次の3項目を整えてください。\n【確認した内容】\n【考えられること・注意点】\n【対応の考え方】\n\n" +
      "回答は必ず上記3つの見出しだけにしてください。見出し名は変更せず、感想、解説、総評、追加の改善提案は書かないでください。「考えられること・注意点」と「対応の考え方」が未入力でも、同じカード内の入力内容から分かる範囲で整えてください。\n\n" +
      "【現在のカード入力】\n" +
      `確認項目名：${area}\n` +
      `状態：${condition}\n` +
      `対応の目安：${priority}\n` +
      `確認した内容：${valueOrBlank(finding.observation)}\n` +
      `考えられること・注意点：${valueOrBlank(finding.concern)}\n` +
      `対応の考え方：${valueOrBlank(finding.proposal)}\n\n` +
      "【回答形式】\n" +
      "【確認した内容】\n本文\n\n" +
      "【考えられること・注意点】\n本文\n\n" +
      "【対応の考え方】\n本文\n\n" +
      "【文字数の目安】\n" +
      "【確認した内容】220字以内\n" +
      "【考えられること・注意点】260字以内\n" +
      "【対応の考え方】260字以内\n" +
      "各欄の文字数目安内で、必要な説明は省略しすぎず、お客様が納得して判断できる文章にしてください。短くまとめることよりも、分かりやすく伝わることを優先してください。無理に文字数を増やさず、理由・背景・不安への配慮・対応する意味が自然に伝わる文章を優先してください。短い例を入れた方が伝わりやすい場合は、自然な範囲で入れてください。ただし、入力内容にない原因・工事内容・効果・危険性を断定して追加しないでください。\n\n" +
      "【注意事項】\n" +
      "入力内容にない劣化原因、工事内容、効果、危険性を勝手に追加しないでください。写真や入力内容から分からないことは断定しないでください。\n" +
      "断定できない内容は「可能性があります」「確認が必要です」「おすすめします」「検討できます」などの表現を使ってください。\n" +
      "「前項と同様」「上記の通り」「前頁と同様」「同じです」などは使わず、この項目だけで意味が通る文章に言い換えてください。\n" +
      "専門的すぎる言葉は一般のお客様にも伝わる言葉へ整えてください。例：防滑性のある仕上げ材 → 滑りにくい仕上げ材、シーリング → シーリング（目地の防水材）。\n" +
      "売り込み感を強くしすぎず、お客様が納得して判断できる文章にしてください。"
    );
  }

  async function copyFindingAiConsultationPrompt(findingId) {
    const finding = state.findings.find((item) => item.id === findingId);
    if (!finding) return;
    if (!safeText(finding.observation).trim()) {
      window.alert(
        "まず「確認した内容」を入力してください。\n" +
          "箇条書きでも大丈夫です。\n" +
          "AIは入力済みの内容をもとに、文章を分かりやすく整えるための補助です。",
      );
      return;
    }
    const prompt = buildFindingAiConsultationPrompt(finding);
    if (await copyPlainText(prompt)) {
      showToast(
        "AI相談文をコピーしました。\n" +
          "ChatGPTやGeminiなどのAIへ貼り付けて、文章案を確認してください。\n" +
          "AIの回答は参考です。最終的な内容は担当者が確認してください。",
        5200,
      );
    } else {
      window.alert(`AI相談文をコピーできませんでした。\n\n${prompt}`);
    }
  }

  function buildProposalAiConsultationPrompt() {
    const valueOrBlank = (value) => safeText(value).trim() || "未入力";
    return (
      "【AI相談用プロンプト】\n\n" +
      "これはアプリ機能の一つです。作成した文章は、建物調査報告書メーカーの各入力欄へコピーして使用します。前置きや感想、余計な補足説明はできるだけ省き、そのまま貼り付けやすい形で回答してください。\n\n" +
      "この相談文の目的は、新しく診断することではありません。担当者が入力・選択した内容をもとに、施工方針まわりの文章を一般のお客様にも伝わる自然な表現へ整えることです。\n\n" +
      AI_WRITING_GUIDANCE +
      "\n\n" +
      "施工方針セクションに入力されている内容だけを整えてください。入力内容から確認できないことは断定せず、強い売り込み表現にはしないでください。\n\n" +
      "【現在の入力内容】\n" +
      `ご提案内容：${valueOrBlank(state.proposal.planName)}\n` +
      `おすすめする施工方針：${valueOrBlank(state.summary.recommendation)}\n` +
      `主な工事内容：${valueOrBlank(state.proposal.scope)}\n` +
      `あわせておすすめしたい対策：${valueOrBlank(state.summary.additionalRecommendations)}\n` +
      `工事中に確認が必要なこと：${valueOrBlank(state.proposal.cautions)}\n` +
      `今後注意しておきたい点：${valueOrBlank(state.proposal.watchPoint)}\n` +
      `最後にお伝えしたいこと：${valueOrBlank(state.proposal.closing)}\n\n` +
      "【回答形式】\n" +
      "回答は必ず次の7つの見出しだけにしてください。見出し名は変更せず、上記以外の見出し、前置き、感想、解説、総評、追加提案は書かないでください。\n\n" +
      "【ご提案内容】\n本文\n\n" +
      "【おすすめする施工方針】\n本文\n\n" +
      "【主な工事内容】\n本文\n\n" +
      "【あわせておすすめしたい対策】\n本文\n\n" +
      "【工事中に確認が必要なこと】\n本文\n\n" +
      "【今後注意しておきたい点】\n本文\n\n" +
      "【最後にお伝えしたいこと】\n本文\n\n" +
      "【文字数の目安】\n" +
      "【ご提案内容】60字以内\n" +
      "【おすすめする施工方針】260字以内\n" +
      "【主な工事内容】220字以内\n" +
      "【あわせておすすめしたい対策】260字以内\n" +
      "【工事中に確認が必要なこと】260字以内\n" +
      "【今後注意しておきたい点】220字以内\n" +
      "【最後にお伝えしたいこと】260字以内\n" +
      "各欄の文字数目安内で、必要な説明は省略しすぎず、お客様が納得して判断できる文章にしてください。短くまとめることよりも、分かりやすく伝わることを優先してください。無理に文字数を増やさず、理由・背景・不安への配慮・対応する意味が自然に伝わる文章を優先してください。短い例を入れた方が伝わりやすい場合は、自然な範囲で入れてください。ただし、入力内容にない原因・工事内容・効果・危険性を断定して追加しないでください。\n\n" +
      "【重要な注意事項】\n" +
      "・入力内容にない劣化原因、工事内容、効果、危険性を断定しないでください。\n" +
      "・価格、保証、法的判断、効果の断定はしないでください。\n" +
      "・写真や入力内容から分からないことは断定しないでください。\n" +
      "・断定できない内容は「可能性があります」「確認が必要です」「おすすめします」「検討できます」などの表現を使ってください。\n" +
      "・「前項と同様」「上記の通り」「前頁と同様」「同じです」などは使わず、その欄だけで意味が通る文章にしてください。\n" +
      "・専門的すぎる言葉は、一般のお客様にも伝わる言葉へ整えてください。\n" +
      "・同じ内容の繰り返しを減らし、報告書全体の流れが自然になるようにしてください。\n" +
      "・売り込み感を強くしすぎず、お客様が納得して判断できる文章にしてください。\n" +
      "・不要な工事を強くすすめる表現は避けてください。"
    );
  }

  async function copyProposalAiConsultationPrompt() {
    const hasProposalMaterial = [
      state.proposal.planName,
      state.summary.recommendation,
      state.proposal.scope,
      state.summary.additionalRecommendations,
      state.proposal.cautions,
      state.proposal.watchPoint,
      state.proposal.closing,
    ].some((value) => !isBlank(value));
    if (!hasProposalMaterial) {
      window.alert(
        "先に施工方針セクションの内容を入力してください。\n" +
          "AIは同じセクションに入力済みの内容をもとに、文章を整えるための補助です。",
      );
      return;
    }
    const prompt = buildProposalAiConsultationPrompt();
    if (await copyPlainText(prompt)) {
      showToast(
        "施工方針のAI相談文をコピーしました。\n" +
          "ChatGPTやGeminiなどのAIへ貼り付けて、文章案を確認してください。\n" +
          "AIの回答は参考です。最終的な内容は担当者が確認してください。",
        5200,
      );
    } else {
      window.alert(`施工方針のAI相談文をコピーできませんでした。\n\n${prompt}`);
    }
  }

  function hasReportSectionAiMaterial(sectionKey) {
    if (sectionKey === "concern") return !isBlank(state.summary.customerConcern);
    if (sectionKey === "assessment") {
      return [
        state.assessment.overall,
        state.assessment.urgency,
        state.assessment.policy,
        ...(state.assessment.items || []).map((item) => item.value),
      ].some((value) => !isBlank(value));
    }
    return !isBlank(state.summary.overall);
  }

  function buildReportSectionAiPrompt(sectionKey) {
    const valueOrBlank = (value) => safeText(value).trim() || "未入力";
    const commonStart =
      "【AI相談用プロンプト】\n\n" +
      "これはアプリ機能の一つです。作成した文章は、建物調査報告書メーカーの入力欄へコピーして使用します。前置きや感想、余計な補足説明は省き、そのまま貼り付けやすい形で回答してください。\n\n" +
      "この相談文の目的は、新しく診断することではありません。担当者が入力・選択した内容をもとに、一般のお客様にも伝わる自然な文章へ整えることです。\n\n" +
      AI_WRITING_GUIDANCE +
      "\n\n回答には、今回指定する入力欄の見出しだけを使用してください。\n\n";

    if (sectionKey === "concern") {
      return (
        commonStart +
        "お客様から聞き取った内容をもとに、何を心配されているのか、何を確認したいのかが伝わる文章へ整えてください。入力内容にない不安や希望を勝手に追加せず、言い回しだけをやさしく自然に整えてください。\n\n" +
        "【現在の入力内容】\n" +
        `お客様のご不安・ご相談内容：${valueOrBlank(state.summary.customerConcern)}\n` +
        "\n\n【回答形式】\n回答は次の見出しだけにしてください。ほかの見出し、前置き、感想、解説、総評は書かないでください。\n\n" +
        "【お客様のご不安・ご相談内容】\n本文\n\n" +
        "【文字数の目安】\n【お客様のご不安・ご相談内容】260字以内\n" +
        "文字数目安内で、お客様の不安や希望を省略しすぎず、何を確認したいのかが分かる文章にしてください。\n\n" +
        AI_OUTPUT_SAFETY_GUIDANCE
      );
    }

    if (sectionKey === "assessment") {
      const assessmentInputs = (state.assessment.items || [])
        .map((item) => `【目安：${item.label}】\n程度：${item.value ? `目安${item.value}` : "未入力"}`)
        .join("\n\n");
      return (
        commonStart +
        "今回選択されている6項目の程度と、3つの説明欄を分かりやすく整えてください。「緊急性について」は長文説明欄です。「目安：緊急性」の程度とは別の欄として扱ってください。\n\n" +
        "【現在の入力内容】\n" +
        `${assessmentInputs}\n\n` +
        `【総合目安】\n${valueOrBlank(state.assessment.overall)}\n\n` +
        `【緊急性について】\n${valueOrBlank(state.assessment.urgency)}\n\n` +
        `【おすすめの方向性】\n${valueOrBlank(state.assessment.policy)}\n` +
        "\n\n【回答形式】\n回答は次の9つの見出しだけにしてください。見出し名は変更せず、6項目の程度は現在の値をそのまま回答してください。\n\n" +
        `${assessmentAiHeadings.map((item) => `【目安：${item.label}】\n程度：目安1〜目安5`).join("\n\n")}\n\n` +
        "【総合目安】\n本文\n\n" +
        "【緊急性について】\n本文\n\n" +
        "【おすすめの方向性】\n本文\n\n" +
        "【文字数の目安】\n" +
        "【総合目安】120字以内\n" +
        "【緊急性について】160字以内\n" +
        "【おすすめの方向性】200字以内\n" +
        "各欄の文字数目安内で、現在の評価と対応時期が分かりやすく伝わる文章にしてください。\n\n" +
        AI_OUTPUT_SAFETY_GUIDANCE
      );
    }

    return (
      commonStart +
      "入力済みの全体まとめを、今回分かったこと、心配な点、対応の方向性が自然につながる文章へ整えてください。入力内容にない判断や提案は追加しないでください。\n\n" +
      "【現在の入力内容】\n" +
      `全体のまとめ：${valueOrBlank(state.summary.overall)}\n` +
      "\n\n【回答形式】\n回答は次の見出しだけにしてください。ほかの見出し、前置き、感想、解説、総評は書かないでください。\n\n" +
      "【全体のまとめ】\n本文\n\n" +
      "【文字数の目安】\n【全体のまとめ】300字以内\n" +
      "文字数目安内で、確認結果、心配な点、対応の方向性と安心材料を省略しすぎず、自然につなげてください。\n\n" +
      AI_OUTPUT_SAFETY_GUIDANCE
    );
  }

  async function copyReportSectionAiPrompt(sectionKey) {
    if (!hasReportSectionAiMaterial(sectionKey)) {
      const labels = {
        concern: "ご相談内容",
        assessment: "今回の確認結果にもとづく目安",
        summary: "全体まとめ",
      };
      window.alert(
        `先に「${labels[sectionKey] || "対象項目"}」を入力してください。\n` +
          "AIは同じセクションに入力済みの内容をもとに、文章を整えるための補助です。",
      );
      return;
    }
    const labels = {
      concern: "ご相談内容",
      assessment: "目安",
      summary: "全体まとめ",
    };
    const label = labels[sectionKey] || "対象項目";
    const prompt = buildReportSectionAiPrompt(sectionKey);
    if (await copyPlainText(prompt)) {
      showToast(
        `${label}のAI相談文をコピーしました。\n` +
          "ChatGPTやGeminiなどのAIへ貼り付けて、文章案を確認してください。\n" +
          "AIの回答は参考です。最終的な内容は担当者が確認してください。",
        5200,
      );
    } else {
      window.alert(`${label}のAI相談文をコピーできませんでした。\n\n${prompt}`);
    }
  }

  async function copyPlainText(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      // Use the local HTML compatible copy method below.
    }
    const textarea = el("textarea", {
      value: text,
      style: "position:fixed;left:-9999px;top:0",
    });
    document.body.appendChild(textarea);
    textarea.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (error) {
      copied = false;
    } finally {
      textarea.remove();
    }
    return copied;
  }

  async function exportJson() {
    await saveDataAs();
  }

  async function newReport() {
    const action = await confirmNewReportAction();
    if (action === "cancel") return;
    if (action === "save") {
      const saved = await saveCurrentReport();
      if (!saved) return;
    }
    await createNewReportState();
  }

  async function createNewReportState() {
    const savedCompany = loadCompanySettings() || clone(state.company);
    state = clone(defaultState);
    state.company = normalizeCompanySettings(savedCompany);
    currentDirectoryHandle = null;
    await forgetCurrentDirectoryHandle();
    currentReportName = "未保存の新規報告書";
    currentLocationLabel = "未設定";
    startScreenVisible = false;
    externalDirty = true;
    saveState({ allowDestructive: true });
    setSaveStatus("未保存の変更があります", "新規作成しました");
    render();
  }

  async function saveDataAs() {
    let safeName = "";
    try {
      const folderName = prompt("保存する報告書フォルダ名を入力してください。", sanitizeFolderName(inferReportName(state)));
      if (!folderName) return false;
      safeName = sanitizeFolderName(folderName);
      if (!safeName) {
        window.alert("フォルダ名を入力してください。");
        return false;
      }
      if (isReservedFolderName(safeName)) {
        window.alert("photos または backup という名前は報告書フォルダ名に使えません。別の名前を入力してください。");
        return false;
      }
      setSaveStatus("保存中", "名前を付けて保存しています");
      if (window.showDirectoryPicker) {
        const parentHandle = await window.showDirectoryPicker({ mode: "readwrite" });
        if (isReservedFolderName(parentHandle.name)) {
          window.alert("このフォルダは保存先にできません。photos または backup ではなく、保存場所の親フォルダを選択してください。");
          setSaveStatus(externalDirty ? "未保存の変更があります" : "保存済み", saveStatus.detail);
          return false;
        }
        await ensureDirectoryPermission(parentHandle, "readwrite");
        const reportHandle = await parentHandle.getDirectoryHandle(safeName, { create: true });
        if ((await directoryHasReportData(reportHandle)) && !window.confirm("同じ名前の報告書フォルダがあります。上書きしますか？")) {
          setSaveStatus(externalDirty ? "未保存の変更があります" : "保存済み", saveStatus.detail);
          return false;
        }
        await writeProjectDirectory(reportHandle);
        currentDirectoryHandle = reportHandle;
        currentReportName = safeName;
        currentLocationLabel = `${parentHandle.name || "選択した場所"} > ${safeName}`;
        await rememberCurrentDirectoryHandle(currentDirectoryHandle, currentReportName, currentLocationLabel);
        startScreenVisible = false;
        externalDirty = false;
        saveState({ allowDestructive: true, markDirty: false, silent: true });
        setSaveStatus("保存済み", `最終保存：${formatTime(new Date())}`);
        showToast("保存しました");
        return true;
      } else {
        await downloadProjectBundle();
        currentDirectoryHandle = null;
        await forgetCurrentDirectoryHandle();
        currentReportName = safeName;
        currentLocationLabel = "ダウンロード保存";
        startScreenVisible = false;
        externalDirty = false;
        saveState({ allowDestructive: true, markDirty: false, silent: true });
        setSaveStatus("保存済み", `最終保存：${formatTime(new Date())}`);
        showToast("復元用の保存ファイルを作成しました");
        return true;
      }
    } catch (error) {
      if (error && error.name === "AbortError") {
        setSaveStatus(externalDirty ? "未保存の変更があります" : "保存済み", saveStatus.detail);
        return false;
      }
      console.error("Folder save failed", error);
      setSaveStatus("保存中", "フォルダ保存に失敗したため、保存ファイルを作成しています");
      try {
        await downloadProjectBundle();
        currentDirectoryHandle = null;
        await forgetCurrentDirectoryHandle();
        currentReportName = safeName || currentReportName;
        currentLocationLabel = "ダウンロード保存";
        startScreenVisible = false;
        externalDirty = false;
        saveState({ allowDestructive: true, markDirty: false, silent: true });
        setSaveStatus("保存済み", `最終保存：${formatTime(new Date())}`);
        window.alert("保存先フォルダへの書き込みに失敗したため、代わりに復元用の保存データをダウンロードしました。");
        return true;
      } catch (fallbackError) {
        console.error("Fallback download failed", fallbackError);
        setSaveStatus("保存に失敗しました", "もう一度、名前を付けて保存してください", true);
        window.alert("保存に失敗しました。このまま閉じると、前回保存時点まで戻る可能性があります。もう一度「名前を付けて保存」または「上書き保存」を押してください。");
        return false;
      }
    }
  }

  async function saveCurrentReport() {
    if (
      !currentDirectoryHandle &&
      (currentReportName === "未保存の新規報告書" || currentLocationLabel === "未設定")
    ) {
      window.alert("まだ保存先が決まっていません。先に「名前を付けて保存」を行います。");
      return await saveDataAs();
    }
    if (!currentDirectoryHandle) {
      const savedDirectory = await restoreCurrentDirectoryHandle();
      if (savedDirectory) applyRestoredDirectoryHandle(savedDirectory);
    }
    if (!currentDirectoryHandle) {
      const reconnected = await reconnectCurrentDirectoryHandle();
      if (!reconnected) return false;
    }
    try {
      setSaveStatus("保存中", "保存先フォルダのアクセス許可を確認しています");
      await ensureDirectoryPermission(currentDirectoryHandle, "readwrite");
      setSaveStatus("保存中", "上書き保存しています");
      await writeProjectDirectory(currentDirectoryHandle);
      await rememberCurrentDirectoryHandle(currentDirectoryHandle, currentReportName, currentLocationLabel);
      startScreenVisible = false;
      externalDirty = false;
      saveState({ allowDestructive: true, markDirty: false, silent: true });
      setSaveStatus("保存済み", `最終保存：${formatTime(new Date())}`);
      showToast("上書き保存しました");
      return true;
    } catch (error) {
      console.error("Overwrite save failed", error);
      setSaveStatus("保存に失敗しました", "前回の保存先を使用できませんでした。現在の入力内容は残っています", true);
      if (
        window.confirm(
          "前回の保存先フォルダを使用できませんでした。\n" +
            "現在の入力内容は画面上に残っています。\n\n" +
            "保存先を選び直しますか？",
        )
      ) {
        currentDirectoryHandle = null;
        await forgetCurrentDirectoryHandle();
        return await saveDataAs();
      }
      return false;
    }
  }

  async function openSavedData() {
    if (!confirmDiscardUnsaved("開く")) return;
    try {
      setSaveStatus("保存中", "保存データを開いています");
      if (window.showDirectoryPicker) {
        window.alert(
          "保存済みの報告書フォルダを選択してください。\n\n" +
            "この画面では report-data.json が表示されない場合があります。\n\n" +
            "backup と photos が見えている報告書フォルダで、右下の「フォルダーの選択」を押してください。\n\n" +
            "backup や photos の中には入らないでください。",
        );
        const handle = await window.showDirectoryPicker({ mode: "readwrite" });
        await validateReportFolder(handle);
        const data = await readProjectDirectory(handle);
        await loadProjectData(data, handle);
        currentDirectoryHandle = handle;
        currentReportName = handle.name || inferReportName(state);
        currentLocationLabel = handle.name || "選択した報告書フォルダ";
        await rememberCurrentDirectoryHandle(currentDirectoryHandle, currentReportName, currentLocationLabel);
      } else {
        const data = await pickProjectBundleFile();
        if (!data) {
          setSaveStatus(externalDirty ? "未保存の変更があります" : "保存済み", saveStatus.detail);
          return;
        }
        await loadProjectData(data, null);
        currentDirectoryHandle = null;
        await forgetCurrentDirectoryHandle();
        currentReportName = inferReportName(state);
        currentLocationLabel = "保存ファイルから開きました";
      }
      externalDirty = false;
      saveState({ allowDestructive: true, markDirty: false, silent: true });
      startScreenVisible = false;
      render();
      setSaveStatus("保存済み", `最終保存：${formatTime(new Date())}`);
      showToast("保存データを開きました");
    } catch (error) {
      if (error && error.name === "AbortError") {
        setSaveStatus(externalDirty ? "未保存の変更があります" : "保存済み", saveStatus.detail);
        return;
      }
      console.error("Open saved data failed", error);
      setSaveStatus("保存に失敗しました", "保存データを開けませんでした。現在の入力内容は変更していません。", true);
      window.alert(openErrorMessage(error));
    }
  }

  async function restoreFromBackup() {
    if (!confirmDiscardUnsaved("バックアップから復元")) return;
    try {
      if (!window.showDirectoryPicker) {
        window.alert("この環境ではバックアップフォルダからの復元に対応していません。保存データファイルから開いてください。");
        return;
      }
      setSaveStatus("保存中", "バックアップを確認しています");
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      await validateReportFolder(handle);
      const backupDir = await handle.getDirectoryHandle("backup");
      const backups = await listBackupFiles(backupDir);
      if (!backups.length) {
        window.alert("復元できるバックアップが見つかりませんでした。");
        setSaveStatus(externalDirty ? "未保存の変更があります" : "保存済み", saveStatus.detail);
        return;
      }
      const message = backups.map((item, index) => `${index + 1}. ${item.name}`).join("\n");
      const answer = prompt(`復元するバックアップ番号を入力してください。\n\n${message}`, String(1));
      if (!answer) return;
      const selected = backups[Number(answer) - 1];
      if (!selected) {
        window.alert("番号が正しくありません。");
        return;
      }
      const data = JSON.parse(await (await selected.handle.getFile()).text());
      await loadProjectData(data, handle);
      currentDirectoryHandle = handle;
      currentReportName = handle.name || inferReportName(state);
      currentLocationLabel = `${currentReportName}（バックアップから復元）`;
      await rememberCurrentDirectoryHandle(currentDirectoryHandle, currentReportName, currentLocationLabel);
      startScreenVisible = false;
      externalDirty = true;
      saveState({ allowDestructive: true });
      render();
      setSaveStatus("未保存の変更があります", "バックアップから復元しました。必要に応じて保存してください。");
    } catch (error) {
      if (error && error.name === "AbortError") return;
      console.error("Restore backup failed", error);
      setSaveStatus("保存に失敗しました", "バックアップを復元できませんでした", true);
      window.alert("バックアップを復元できませんでした。現在の入力内容は変更していません。");
    }
  }

  async function writeProjectDirectory(directoryHandle) {
    if (isReservedFolderName(directoryHandle.name)) {
      throw new Error("このフォルダは保存先にできません。報告書名の親フォルダを選択してください。");
    }
    await ensureDirectoryPermission(directoryHandle, "readwrite");
    const backupDir = await directoryHandle.getDirectoryHandle("backup", { create: true });
    await backupExistingFile(directoryHandle, backupDir, "report-data.json");

    const photosDir = await directoryHandle.getDirectoryHandle("photos", { create: true });
    for (const photo of state.photos) {
      const photoId = photo.photoId || photo.id;
      const blob = await getPhotoBlob(photoId);
      if (!blob) continue;
      photo.fileName = photo.fileName || `${photoId}.jpg`;
      const fileHandle = await photosDir.getFileHandle(photo.fileName, { create: true });
      await writeFileHandle(fileHandle, blob);
    }

    const dataHandle = await directoryHandle.getFileHandle("report-data.json", { create: true });
    await writeFileHandle(
      dataHandle,
      new Blob([JSON.stringify(await buildProjectData({ includeEmbeddedPhotos: false }), null, 2)], { type: "application/json" }),
    );
    await verifySavedDirectory(directoryHandle);
  }

  async function verifySavedDirectory(directoryHandle) {
    const dataHandle = await directoryHandle.getFileHandle("report-data.json");
    const file = await dataHandle.getFile();
    if (!file || file.size <= 0) {
      throw new Error("report-data.json を作成できませんでした。");
    }
    await directoryHandle.getDirectoryHandle("photos");
  }

  async function validateReportFolder(directoryHandle) {
    if (!directoryHandle) throw new Error("報告書フォルダが選択されていません。\n現在の入力内容は変更していません。");
    if (isReservedFolderName(directoryHandle.name)) {
      throw new Error(
        "backup フォルダや photos フォルダは選択できません。\n" +
          "その中には入らず、report-data.json・photos・backup が入っている親フォルダを選択してください。\n" +
          "現在の入力内容は変更していません。",
      );
    }
    try {
      await directoryHandle.getFileHandle("report-data.json");
    } catch (error) {
      throw new Error(
        "report-data.json が見つかりませんでした。\n" +
          "backup と photos が見えている報告書フォルダを選択してください。\n" +
          "現在の入力内容は変更していません。",
      );
    }
    try {
      await directoryHandle.getDirectoryHandle("photos");
    } catch (error) {
      throw new Error(
        "photos フォルダが見つかりませんでした。\n" +
          "report-data.json と photos フォルダが入っている報告書フォルダを選択してください。\n" +
          "現在の入力内容は変更していません。",
      );
    }
  }

  async function directoryHasReportData(directoryHandle) {
    try {
      await directoryHandle.getFileHandle("report-data.json");
      return true;
    } catch (error) {
      return false;
    }
  }

  async function listBackupFiles(backupDir) {
    const files = [];
    for await (const [name, handle] of backupDir.entries()) {
      if (handle.kind === "file" && /\.json$/i.test(name)) {
        files.push({ name, handle });
      }
    }
    return files.sort((a, b) => b.name.localeCompare(a.name));
  }

  function isReservedFolderName(name) {
    return ["photos", "backup"].includes(String(name || "").trim().toLowerCase());
  }

  function inferReportName(source) {
    return sanitizeFolderName(source?.project?.workName || source?.project?.clientName || "新しい報告書");
  }

  function sanitizeFolderName(value) {
    return String(value || "")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
  }

  function openDirectoryHandleDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB is not available"));
        return;
      }
      const request = indexedDB.open(DIRECTORY_HANDLE_DB_NAME, DIRECTORY_HANDLE_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DIRECTORY_HANDLE_STORE_NAME)) {
          db.createObjectStore(DIRECTORY_HANDLE_STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Directory handle database open failed"));
    });
  }

  async function rememberCurrentDirectoryHandle(handle, reportName, locationLabel) {
    if (!handle) return false;
    try {
      const db = await openDirectoryHandleDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(DIRECTORY_HANDLE_STORE_NAME, "readwrite");
        tx.objectStore(DIRECTORY_HANDLE_STORE_NAME).put({
          id: CURRENT_DIRECTORY_HANDLE_KEY,
          handle,
          reportName: reportName || handle.name || "",
          locationLabel: locationLabel || handle.name || "",
          updatedAt: new Date().toISOString(),
        });
        tx.oncomplete = () => {
          db.close();
          resolve(true);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error || new Error("Directory handle save failed"));
        };
      });
    } catch (error) {
      console.warn("Directory handle could not be remembered", error);
      return false;
    }
  }

  async function restoreCurrentDirectoryHandle() {
    try {
      const db = await openDirectoryHandleDb();
      return await new Promise((resolve) => {
        const tx = db.transaction(DIRECTORY_HANDLE_STORE_NAME, "readonly");
        const request = tx.objectStore(DIRECTORY_HANDLE_STORE_NAME).get(CURRENT_DIRECTORY_HANDLE_KEY);
        request.onsuccess = () => {
          const record = request.result;
          resolve(record && record.handle && record.handle.kind === "directory" ? record : null);
        };
        request.onerror = () => resolve(null);
        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
      });
    } catch (error) {
      return null;
    }
  }

  function applyRestoredDirectoryHandle(record) {
    if (!record || !record.handle) return false;
    currentDirectoryHandle = record.handle;
    currentReportName = record.reportName || currentDirectoryHandle.name || currentReportName;
    currentLocationLabel = record.locationLabel || currentDirectoryHandle.name || currentLocationLabel;
    return true;
  }

  async function reconnectCurrentDirectoryHandle() {
    if (!window.showDirectoryPicker) {
      window.alert("この環境では保存先フォルダを再接続できません。「名前を付けて保存」を行ってください。");
      return false;
    }
    window.alert(
      "保存先の記憶機能を追加する前に作成した報告書は、初回のみ保存先との再接続が必要です。\n\n" +
        "report-data.json・photos・backup が入っている報告書フォルダを選択してください。\n" +
        "再接続後は「上書き保存」で同じ保存先を使用します。",
    );
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      await validateReportFolder(handle);
      await ensureDirectoryPermission(handle, "readwrite");
      currentDirectoryHandle = handle;
      currentReportName = handle.name || currentReportName;
      currentLocationLabel = handle.name || "選択した報告書フォルダ";
      const remembered = await rememberCurrentDirectoryHandle(currentDirectoryHandle, currentReportName, currentLocationLabel);
      if (!remembered) {
        setSaveStatus("保存中", "保存先へ再接続しましたが、ページ更新後は再選択が必要な場合があります");
      }
      return true;
    } catch (error) {
      if (error && error.name === "AbortError") return false;
      console.error("Directory reconnect failed", error);
      setSaveStatus("保存に失敗しました", "保存先フォルダへ再接続できませんでした。現在の入力内容は残っています", true);
      window.alert(
        "保存先フォルダへ再接続できませんでした。\n" +
          "report-data.json・photos・backup が入っている報告書フォルダを選択してください。\n" +
          "現在の入力内容は変更していません。",
      );
      return false;
    }
  }

  async function forgetCurrentDirectoryHandle() {
    try {
      const db = await openDirectoryHandleDb();
      return await new Promise((resolve) => {
        const tx = db.transaction(DIRECTORY_HANDLE_STORE_NAME, "readwrite");
        tx.objectStore(DIRECTORY_HANDLE_STORE_NAME).delete(CURRENT_DIRECTORY_HANDLE_KEY);
        tx.oncomplete = () => {
          db.close();
          resolve(true);
        };
        tx.onerror = () => {
          db.close();
          resolve(false);
        };
      });
    } catch (error) {
      return false;
    }
  }

  async function queryDirectoryPermission(directoryHandle, mode = "readwrite") {
    if (!directoryHandle || typeof directoryHandle.queryPermission !== "function") return "granted";
    try {
      return await directoryHandle.queryPermission({ mode });
    } catch (error) {
      return "prompt";
    }
  }

  async function ensureDirectoryPermission(directoryHandle, mode = "readwrite") {
    if (!directoryHandle) throw new Error("保存先フォルダが選択されていません。");
    if (typeof directoryHandle.queryPermission !== "function") return;
    const options = { mode };
    const current = await queryDirectoryPermission(directoryHandle, mode);
    if (current === "granted") return;
    if (typeof directoryHandle.requestPermission === "function") {
      const requested = await directoryHandle.requestPermission(options);
      if (requested === "granted") return;
    }
    throw new Error("保存先フォルダへの書き込み許可がありません。");
  }

  async function backupExistingFile(directoryHandle, backupDir, fileName) {
    try {
      const existingHandle = await directoryHandle.getFileHandle(fileName);
      const existingFile = await existingHandle.getFile();
      const stamp = formatBackupStamp(new Date());
      const backupHandle = await backupDir.getFileHandle(`${fileName.replace(/\.json$/i, "")}_${stamp}.json`, { create: true });
      await writeFileHandle(backupHandle, await existingFile.text());
    } catch (error) {
      // No existing save yet, so there is nothing to back up.
    }
  }

  async function writeFileHandle(fileHandle, content) {
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async function readProjectDirectory(directoryHandle) {
    const dataHandle = await directoryHandle.getFileHandle("report-data.json");
    let data;
    try {
      data = JSON.parse(await (await dataHandle.getFile()).text());
    } catch (error) {
      throw new Error(
        "保存データの読み込みに失敗しました。\n" +
          "report-data.json の形式を確認してください。\n" +
          "現在の入力内容は変更していません。",
      );
    }
    validateProjectData(data);
    const photosDir = await directoryHandle.getDirectoryHandle("photos");
    const photoEntries = (data.state?.photos || data.photos || []);
    for (const photo of photoEntries) {
      if (!photo.fileName) continue;
      try {
        const photoHandle = await photosDir.getFileHandle(photo.fileName);
        const blob = await (await photoHandle.getFile()).arrayBuffer();
        const fileBlob = new Blob([blob], { type: photo.mimeType || "image/jpeg" });
        await putPhotoBlob(photo.photoId || photo.id, fileBlob);
      } catch (error) {
        // Keep text data even if one photo file is missing.
      }
    }
    return data;
  }

  async function downloadProjectBundle() {
    const data = await buildProjectData({ includeEmbeddedPhotos: true });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `建物調査報告書_${state.project.clientName || "お客様"}_保存データ.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function pickProjectBundleFile() {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json,.json";
      input.onchange = () => {
        const file = input.files && input.files[0];
        if (!file) {
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          try {
            resolve(JSON.parse(reader.result));
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(reader.error || new Error("File read failed"));
        reader.readAsText(file);
      };
      input.click();
    });
  }

  async function buildProjectData(options = {}) {
    const data = {
      app: "建物調査報告書メーカー",
      version: 2,
      savedAt: new Date().toISOString(),
      reportName: currentReportName || inferReportName(state),
      state: serializeStateForStorage(state),
    };
    if (options.includeEmbeddedPhotos) {
      data.photos = [];
      for (const photo of state.photos) {
        const photoId = photo.photoId || photo.id;
        const blob = await getPhotoBlob(photoId);
        if (!blob) continue;
        data.photos.push({
          id: photoId,
          fileName: photo.fileName || `${photoId}.jpg`,
          mimeType: blob.type || "image/jpeg",
          dataUrl: await blobToDataUrl(blob),
        });
      }
    }
    return data;
  }

  async function loadProjectData(data, directoryHandle) {
    validateProjectData(data);
    const incomingState = data.state || data;
    const nextState = mergeState(defaultState, incomingState);
    if (!incomingState.company) {
      nextState.company = clone(state.company);
      normalizeState(nextState);
    }
    if (Array.isArray(data.photos)) {
      for (const photoData of data.photos) {
        if (!photoData.dataUrl) continue;
        const blob = dataUrlToBlob(photoData.dataUrl);
        await putPhotoBlob(photoData.id, blob);
      }
    }
    await migrateEmbeddedPhotosToIndexedDB(nextState);
    await hydratePhotoSources(nextState);
    state = nextState;
    currentDirectoryHandle = directoryHandle;
    currentReportName = data.reportName || inferReportName(state);
  }

  function validateProjectData(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error(
        "保存データの読み込みに失敗しました。\n" +
          "report-data.json の形式を確認してください。\n" +
          "現在の入力内容は変更していません。",
      );
    }
    const candidateState = data.state || data;
    if (!candidateState || typeof candidateState !== "object" || Array.isArray(candidateState)) {
      throw new Error(
        "report-data.json に復元に必要な state 情報が見つかりませんでした。\n" +
          "保存済みの報告書フォルダを確認してください。\n" +
          "現在の入力内容は変更していません。",
      );
    }
    const hasStateLikeData = Boolean(
      candidateState.project ||
        candidateState.summary ||
        candidateState.proposal ||
        candidateState.assessment ||
        Array.isArray(candidateState.findings) ||
        Array.isArray(candidateState.photos),
    );
    if (!hasStateLikeData) {
      throw new Error(
        "report-data.json に復元に必要なデータが見つかりませんでした。\n" +
          "report-data.json・photos・backup が入っている報告書フォルダを選択してください。\n" +
          "現在の入力内容は変更していません。",
      );
    }
  }

  function openErrorMessage(error) {
    if (error instanceof SyntaxError) {
      return "保存データの読み込みに失敗しました。\nreport-data.json の形式を確認してください。\n現在の入力内容は変更していません。";
    }
    return (
      error?.message ||
      "保存データの読み込みに失敗しました。\nreport-data.json の形式を確認してください。\n現在の入力内容は変更していません。"
    );
  }

  function setSaveStatus(label, detail = "", failed = false) {
    saveStatus = { label, detail, failed };
    updateSaveStatusView();
  }

  function updateSaveStatusView() {
    const node = document.getElementById("save-status");
    if (!node) return;
    node.className = `save-status ${saveStatus.failed ? "failed" : ""}`.trim();
    node.innerHTML = "";
    node.appendChild(el("strong", { text: saveStatus.label }));
    if (saveStatus.detail) node.appendChild(el("span", { text: saveStatus.detail }));
  }

  function formatTime(date) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function formatBackupStamp(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${d}_${hh}${mm}`;
  }

  function handleBeforeUnload(event) {
    if (!externalDirty && !saveStatus.failed) return;
    event.preventDefault();
    event.returnValue = "";
  }

  function confirmDiscardUnsaved(actionName) {
    if (!externalDirty && !saveStatus.failed) return true;
    if (actionName === "開く") {
      return window.confirm(
        "未保存の変更があります。\n" +
          "保存せずに別の報告書を開くと、現在の入力内容が失われる可能性があります。\n\n" +
          "保存せずに開きますか？",
      );
    }
    return window.confirm(`未保存の変更があります。\n保存せずに「${actionName}」を続けると、入力内容が失われる可能性があります。\n\n続けますか？`);
  }

  function confirmNewReportAction() {
    const hasUnsavedChanges = externalDirty || saveStatus.failed;
    return new Promise((resolve) => {
      const overlay = el("div", { className: "confirm-screen" }, [
        el("div", { className: "confirm-dialog" }, [
          el("h2", { text: hasUnsavedChanges ? "編集中の内容があります。" : "新しい報告書を作成しますか？" }),
          el("p", {
            text: hasUnsavedChanges
              ? "新規作成すると、現在の入力内容は画面上から消えます。保存してから新規作成しますか？"
              : "現在の画面内容は初期状態に戻ります。必要な場合は保存してから新規作成できます。",
          }),
          el("div", { className: "confirm-actions" }, [
            button("保存して新規作成", "btn primary", () => finish("save")),
            button(hasUnsavedChanges ? "保存せずに新規作成" : "新規作成する", hasUnsavedChanges ? "btn danger" : "btn primary", () =>
              finish("discard"),
            ),
            button("キャンセル", "btn", () => finish("cancel")),
          ]),
        ]),
      ]);

      function finish(action) {
        overlay.remove();
        resolve(action);
      }

      document.body.appendChild(overlay);
    });
  }

  async function requestPrint() {
    if (!(await confirmMissingInputsBeforePrint())) return;
    const overLimitFields = pdfOverLimitFields();
    if (overLimitFields.length && !(await confirmPdfTextLength(overLimitFields))) return;
    if (
      companyInfoChangePending &&
      !window.confirm(
        "会社情報に変更があります。\n変更後の会社情報で報告書を出力しますか？",
      )
    ) {
      return;
    }
    companyInfoChangePending = false;
    syncPrintFooterStyle();
    window.print();
  }

  function pdfOverLimitFields() {
    const fields = [
      pdfTextField("projectWorkName", state.project.workName),
      pdfTextField("projectClientName", state.project.clientName),
      pdfTextField("projectAddress", state.project.address),
      isOtherValue(state.project.buildingType, buildingTypeOptions)
        ? pdfTextField("projectBuildingTypeOther", state.project.buildingType)
        : null,
      isOtherValue(state.project.projectType, projectOptions)
        ? pdfTextField("projectTypeOther", state.project.projectType)
        : null,
      pdfTextField("projectWeather", state.project.weather),
      pdfTextField("projectPurpose", state.project.purpose),
      pdfTextField("customerConcern", state.summary.customerConcern),
      pdfTextField("assessmentOverall", state.assessment.overall),
      pdfTextField("assessmentUrgency", state.assessment.urgency),
      pdfTextField("assessmentPolicy", state.assessment.policy),
      ...state.findings.flatMap((finding, index) => [
        pdfTextField("findingAreaOther", finding.area, `確認項目${index + 1}`),
        pdfTextField("findingObservation", finding.observation, `確認項目${index + 1}`),
        pdfTextField("findingConcern", finding.concern, `確認項目${index + 1}`),
        pdfTextField("findingProposal", finding.proposal, `確認項目${index + 1}`),
      ]),
      ...state.photos.flatMap((photo, index) => [
        pdfTextField("photoTitle", photo.title, `写真${index + 1}`),
        pdfTextField("photoAreaOther", photo.area, `写真${index + 1}`),
        isOtherValue(photo.condition, conditionOptions)
          ? pdfTextField("photoConditionOther", photo.condition, `写真${index + 1}`)
          : null,
        pdfTextField("photoFinding", photo.finding || photo.memo || "", `写真${index + 1}`),
        pdfTextField("photoRecommendation", photo.recommendation, `写真${index + 1}`),
      ]),
      pdfTextField("proposalPlanName", state.proposal.planName),
      pdfTextField("proposalRecommendation", state.summary.recommendation),
      pdfTextField("proposalScope", state.proposal.scope),
      pdfTextField("proposalAdditional", state.summary.additionalRecommendations),
      pdfTextField("proposalCautions", state.proposal.cautions),
      pdfTextField("proposalWatchPoint", state.proposal.watchPoint),
      pdfTextField("proposalClosing", state.proposal.closing),
      pdfTextField("summaryOverall", state.summary.overall),
      ...(state.processDiagram.enabled
        ? [
            pdfTextField("processTitle", state.processDiagram.title),
            pdfTextField("processDescription", state.processDiagram.description),
            ...state.processDiagram.items.map((item, index) =>
              item.type === "divider"
                ? pdfTextField("processDivider", item.text, `工程図解${index + 1}`)
                : [
                    pdfTextField("processStepTitle", item.title, `工程${item.number || index + 1}`),
                    pdfTextField("processStepNote", item.note, `工程${item.number || index + 1}`),
                  ],
            ).flat(),
          ]
        : []),
    ];
    return fields.filter((field) => field && textLength(field.value) > field.limit);
  }

  function pdfTextField(ruleKey, value, prefix = "") {
    const rule = PDF_TEXT_FIELD_RULES[ruleKey];
    return {
      label: prefix ? `${prefix}：${rule.label}` : rule.label,
      value: safeText(value),
      limit: rule.maxLength,
    };
  }

  function confirmPdfTextLength(overLimitFields) {
    return new Promise((resolve) => {
      const fieldList = overLimitFields.map((field) => `・${field.label}`).join("\n");
      const overlay = el("div", { className: "confirm-screen" }, [
        el("div", { className: "confirm-dialog" }, [
          el("h2", { text: "文字数が多い項目があります。" }),
          el("p", {
            text:
              "PDFで文字が重なったり、はみ出す可能性があります。\n\n" +
              `${fieldList}\n\n` +
              "このままPDF保存しますか？",
          }),
          el("div", { className: "confirm-actions" }, [
            button("戻って修正する", "btn", () => finish(false)),
            button("このまま保存する", "btn primary", () => finish(true)),
          ]),
        ]),
      ]);

      function finish(shouldPrint) {
        overlay.remove();
        resolve(shouldPrint);
      }

      document.body.appendChild(overlay);
    });
  }

  async function loadSample() {
    if (!confirmDiscardUnsaved("見本を入れる")) return;
    if (!window.confirm("現在の入力内容を見本データに置き換えます。よろしいですか？")) return;
    const savedCompany = clone(state.company);
    state = clone(sampleState);
    state.company = savedCompany;
    currentDirectoryHandle = null;
    await forgetCurrentDirectoryHandle();
    currentReportName = inferReportName(state);
    currentLocationLabel = "保存先はまだ決まっていません";
    startScreenVisible = false;
    externalDirty = true;
    saveState({ allowDestructive: true });
    render();
    showToast("見本を入れました");
  }

  function loadState() {
    const keys = [STORAGE_KEY, BACKUP_PREVIOUS_KEY, ...listTimestampBackupKeys()];
    for (const key of keys) {
      const parsed = readStoredState(key);
      if (parsed) return parsed;
    }
    return clone(defaultState);
  }

  function saveState(options = {}) {
    try {
      if (options.markDirty !== false) externalDirty = true;
      const currentRaw = localStorage.getItem(STORAGE_KEY);
      const nextRaw = JSON.stringify(serializeStateForStorage(state));
      if (!options.allowDestructive && isLargeDataReduction(currentRaw, nextRaw)) {
        preserveBackup(currentRaw);
        setSaveStatus("保存に失敗しました", "写真枚数が大きく減るため自動保存を止めました", true);
        showToast("写真枚数が大きく減るため、自動保存を止めました。必要なら名前を付けて保存してください。");
        return false;
      }
      if (currentRaw && currentRaw !== nextRaw) preserveBackup(currentRaw);
      localStorage.setItem(STORAGE_KEY, nextRaw);
      if (!options.silent) {
        setSaveStatus(externalDirty ? "未保存の変更があります" : "保存済み", `最終保存：${formatTime(new Date())}`);
      }
      return true;
    } catch (error) {
      if (!storageWarningShown) {
        storageWarningShown = true;
        showToast("保存容量を超えた可能性があります。名前を付けて保存して保管してください。");
      }
      setSaveStatus("保存に失敗しました", "このまま閉じると前回保存時点まで戻る可能性があります", true);
      return false;
    }
  }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);
        URL.revokeObjectURL(url);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Image encode failed"));
          },
          "image/jpeg",
          0.82,
        );
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Image load failed"));
      };
      image.src = url;
    });
  }

  function serializeStateForStorage(source) {
    const output = clone(source);
    output.photos = (output.photos || []).map((photo) => {
      const copy = { ...photo };
      delete copy.src;
      copy.photoId = copy.photoId || copy.id;
      return copy;
    });
    return output;
  }

  async function migrateEmbeddedPhotosToIndexedDB(targetState) {
    const photos = Array.isArray(targetState.photos) ? targetState.photos : [];
    for (const photo of photos) {
      photo.photoId = photo.photoId || photo.id || createId();
      if (photo.src && photo.src.startsWith("data:")) {
        try {
          const blob = dataUrlToBlob(photo.src);
          await putPhotoBlob(photo.photoId, blob);
          photo.src = URL.createObjectURL(blob);
          photo.fileName = photo.fileName || `${photo.photoId}.jpg`;
          photo.mimeType = blob.type || "image/jpeg";
        } catch (error) {
          // Keep the old src in memory for this session if migration fails.
        }
      }
    }
  }

  async function hydratePhotoSources(targetState) {
    const photos = Array.isArray(targetState.photos) ? targetState.photos : [];
    for (const photo of photos) {
      photo.photoId = photo.photoId || photo.id;
      if (photo.src) continue;
      const blob = await getPhotoBlob(photo.photoId);
      if (blob) {
        photo.src = URL.createObjectURL(blob);
        photo.mimeType = photo.mimeType || blob.type || "image/jpeg";
      }
    }
  }

  function openPhotoDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB is not available"));
        return;
      }
      const request = indexedDB.open(PHOTO_DB_NAME, PHOTO_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PHOTO_STORE_NAME)) {
          db.createObjectStore(PHOTO_STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
    });
  }

  async function putPhotoBlob(id, blob) {
    const db = await openPhotoDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE_NAME, "readwrite");
      tx.objectStore(PHOTO_STORE_NAME).put({
        id,
        blob,
        type: blob.type || "image/jpeg",
        updatedAt: new Date().toISOString(),
      });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error || new Error("Photo save failed"));
      };
    });
  }

  async function getPhotoBlob(id) {
    if (!id) return null;
    try {
      const db = await openPhotoDb();
      return await new Promise((resolve) => {
        const tx = db.transaction(PHOTO_STORE_NAME, "readonly");
        const request = tx.objectStore(PHOTO_STORE_NAME).get(id);
        request.onsuccess = () => resolve(request.result ? request.result.blob : null);
        request.onerror = () => resolve(null);
        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
      });
    } catch (error) {
      return null;
    }
  }

  async function deletePhotoBlob(id) {
    if (!id) return;
    try {
      const db = await openPhotoDb();
      await new Promise((resolve) => {
        const tx = db.transaction(PHOTO_STORE_NAME, "readwrite");
        tx.objectStore(PHOTO_STORE_NAME).delete(id);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          resolve();
        };
      });
    } catch (error) {
      // Deleting unused photo blobs is best effort.
    }
  }

  function dataUrlToBlob(dataUrl) {
    const [meta, payload] = dataUrl.split(",");
    const mime = /data:([^;]+)/.exec(meta)?.[1] || "image/jpeg";
    const binary = atob(payload || "");
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: mime });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("Blob read failed"));
      reader.readAsDataURL(blob);
    });
  }

  function readStoredState(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return mergeState(defaultState, JSON.parse(raw));
    } catch (error) {
      return null;
    }
  }

  function preserveBackup(raw) {
    if (!raw) return;
    try {
      localStorage.setItem(BACKUP_PREVIOUS_KEY, raw);
    } catch (error) {
      return;
    }
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      localStorage.setItem(`${BACKUP_PREFIX}${stamp}`, raw);
      trimTimestampBackups();
    } catch (error) {
      // The previous backup is the important safety net; timestamp backups are best effort.
    }
  }

  function listTimestampBackupKeys() {
    try {
      return Object.keys(localStorage)
        .filter((key) => key.startsWith(BACKUP_PREFIX))
        .sort()
        .reverse();
    } catch (error) {
      return [];
    }
  }

  function trimTimestampBackups() {
    const keys = listTimestampBackupKeys();
    keys.slice(3).forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        // Ignore cleanup failures; saving the main data must stay the priority.
      }
    });
  }

  function isLargeDataReduction(currentRaw, nextRaw) {
    const currentStats = getStoredStats(currentRaw);
    const nextStats = getStoredStats(nextRaw);
    if (!currentStats || !nextStats) return false;
    if (currentStats.photos < 3) return false;
    const photoDrop = currentStats.photos - nextStats.photos;
    if (photoDrop < 2) return false;
    return photoDrop >= Math.ceil(currentStats.photos / 3);
  }

  function getStoredStats(raw) {
    try {
      const data = JSON.parse(raw);
      return {
        photos: Array.isArray(data.photos) ? data.photos.length : 0,
        findings: Array.isArray(data.findings) ? data.findings.length : 0,
      };
    } catch (error) {
      return null;
    }
  }

  function getQualityChecks() {
    const allText = [
      state.summary.overall,
      state.summary.customerConcern,
      state.summary.recommendation,
      state.summary.additionalRecommendations,
      state.proposal.scope,
      state.proposal.cautions,
      state.proposal.closing,
      ...state.findings.flatMap((item) => [item.observation, item.concern, item.proposal]),
    ].join("\n");
    const unsafeWords = ["絶対", "必ず", "完全に", "間違いなく", "100％", "100%"];
    const foundUnsafe = unsafeWords.filter((word) => allText.includes(word));
    const hasCaution = /可能性|場合|確認|必要|状況/.test(allText);
    const hasReason = /ため|理由|状態|範囲|材料|作業|下地|安全/.test(allText);

    return [
      {
        ok: state.summary.overall.trim().length >= 24,
        title: "全体まとめ",
        message: "最後に読むまとめとして、確認内容と対応の考え方が分かる文章になっているかを確認します。",
      },
      {
        ok: state.findings.length > 0,
        title: "確認した箇所",
        message: "どこを確認したのか、箇所ごとの内容が入っているかを確認します。",
      },
      {
        ok: state.photos.length > 0,
        title: "現場写真",
        message: "写真があると、お客様が状態をイメージしやすくなります。",
      },
      {
        ok: hasReason,
        title: "理由が伝わる説明",
        message: "なぜその工事や確認が必要なのか、お客様に伝わる表現になっているかを確認します。",
      },
      {
        ok: hasCaution,
        title: "注意点の書き方",
        message: "状況によって変わる点や、工事中に確認が必要なことをやわらかく伝えられているかを確認します。",
      },
      {
        ok: foundUnsafe.length === 0,
        title: "強すぎる言い切り",
        message: foundUnsafe.length
          ? `「${foundUnsafe.join("」「")}」は強く聞こえるため、必要に応じて言い換えてください。`
          : "強すぎる言い切りは見つかっていません。",
      },
    ];
  }

  function showToast(message, duration = 1800) {
    clearTimeout(toastTimer);
    const old = document.querySelector(".toast");
    if (old) old.remove();
    const node = el("div", { className: "toast", text: message });
    document.body.appendChild(node);
    toastTimer = setTimeout(() => node.remove(), duration);
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }

  function formatSurveyDateTime() {
    const dateText = formatDate(state.project.surveyDate);
    const timeText = state.project.surveyTime;
    if (!timeText) return dateText;
    return `${dateText} ${timeText}`;
  }

  function safeText(value) {
    return value || "";
  }

  function createId() {
    return Math.random().toString(36).slice(2, 10);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function cloneProcessDiagramTemplate(templateId) {
    const template =
      processDiagramTemplates.find((entry) => entry.id === templateId) ||
      processDiagramTemplates.find((entry) => entry.id === "free");
    return clone(template.diagram);
  }

  function hasProcessDiagramContent(diagram) {
    if (!diagram || typeof diagram !== "object") return false;
    if (String(diagram.title || "").trim() || String(diagram.description || "").trim()) return true;
    return Array.isArray(diagram.items)
      ? diagram.items.some((item) =>
          item?.type === "divider"
            ? String(item.text || "").trim()
            : String(item?.title || "").trim() || String(item?.note || "").trim(),
        )
      : false;
  }

  function normalizeProcessDiagram(source) {
    const fallback = {
      enabled: false,
      templateId: "holeRepair",
      ...cloneProcessDiagramTemplate("holeRepair"),
    };
    if (!source || typeof source !== "object" || Array.isArray(source)) return fallback;

    const rawItems = Array.isArray(source.items) ? source.items : Array.isArray(source.steps) ? source.steps : fallback.items;
    const items = rawItems
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const isDivider = item.type === "divider" || Boolean(item.message);
        if (isDivider) {
          return {
            id: item.id || createId(),
            type: "divider",
            text: String(item.text || item.message || ""),
            variant: item.variant || (item.type === "return" ? "return" : "branch"),
          };
        }
        return {
          id: item.id || createId(),
          type: "step",
          number: item.number == null ? "" : String(item.number),
          title: String(item.title || item.text || ""),
          note: String(item.note || item.description || ""),
          variant: item.variant || (["normal", "repair", "finish"].includes(item.type) ? item.type : "normal"),
        };
      });

    return {
      enabled: source.enabled === true || source.visible === true,
      templateId: processDiagramTemplates.some((template) => template.id === source.templateId) ? source.templateId : "free",
      title: String(source.title || ""),
      description: String(source.description || ""),
      items,
    };
  }

  function blankExampleValues(target) {
    Object.assign(target.project, {
      clientName: "",
      workName: "",
      address: "",
      surveyDate: "",
      inspector: "",
      weather: "",
      surveyTime: "",
      buildingType: "",
      projectType: "",
      purpose: "",
    });
    Object.assign(target.summary, {
      overall: "",
      customerConcern: "",
      recommendation: "",
      additionalRecommendations: "",
      estimateNote: "",
    });
    target.findings = [];
    Object.assign(target.proposal, {
      planName: "",
      scope: "",
      cautions: "",
      totalOpinion: "",
      recommendedNow: "",
      watchPoint: "",
      closing: "",
    });
    Object.assign(target.assessment, {
      overall: "",
      urgency: "",
      policy: "",
    });
    target.processDiagram.enabled = false;
    target.assessment.items.forEach((item) => {
      item.value = "";
      item.displayText = "";
      item.memo = "";
    });
  }

  function mergeState(base, incoming) {
    if (!incoming || typeof incoming !== "object") return clone(base);
    const output = clone(base);
    deepMerge(output, incoming);
    normalizeState(output);
    return output;
  }

  function deepMerge(target, source) {
    Object.keys(source || {}).forEach((key) => {
      if (Array.isArray(source[key])) {
        target[key] = source[key];
      } else if (source[key] && typeof source[key] === "object") {
        target[key] = target[key] || {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    });
  }

  function normalizeState(target) {
    target.company = {
      ...clone(defaultState.company),
      ...(target.company || {}),
    };
    const companyServices = normalizeCompanyContact(target.company.services || target.company.contact);
    target.company.services = companyServices;
    target.company.contact = companyServices;
    [
      "name",
      "brandName",
      "contactPerson",
      "postalCode",
      "address",
      "phone",
      "email",
      "website",
      "tagline",
      "logoDataUrl",
      "logoName",
      "logo2DataUrl",
      "logo2Name",
      "companyInfoChangedAt",
    ].forEach((key) => {
      target.company[key] = safeText(target.company[key]);
    });
    target.project = target.project || {};
    if (target.project.siteName) target.project.workName = target.project.siteName;
    delete target.project.siteName;
    if (!target.project.surveyTime) target.project.surveyTime = "";
    target.summary = target.summary || {};
    if (target.summary.nextAction) {
      target.summary.additionalRecommendations = target.summary.nextAction;
    }
    if (!target.summary.additionalRecommendations && target.proposal && target.proposal.recommendedNow) {
      target.summary.additionalRecommendations = target.proposal.recommendedNow;
    }
    delete target.summary.nextAction;
    target.findings = Array.isArray(target.findings) ? target.findings : [];
    target.photos = Array.isArray(target.photos) ? target.photos : [];
    target.findings.forEach((finding) => {
      finding.priority = normalizePriority(finding.priority);
      finding.area = normalizeOptionText(finding.area);
      finding.condition = normalizeConditionText(finding.condition);
    });
    const validFindingIds = new Set(target.findings.map((finding) => finding.id).filter(Boolean));
    target.photos.forEach((photo) => {
      if (!photo.id) photo.id = createId();
      photo.photoId = photo.photoId || photo.id;
      const normalizedFindingId = safeText(photo.findingId);
      photo.findingId = validFindingIds.has(normalizedFindingId) ? normalizedFindingId : "";
      if (!photo.finding && photo.memo) photo.finding = photo.memo;
      if (!photo.recommendation) photo.recommendation = "";
      photo.area = normalizeOptionText(photo.area);
      photo.condition = normalizeConditionText(photo.condition);
      photo.annotations = normalizeAnnotations(photo.annotations);
    });
    target.project.buildingType = normalizeOptionText(target.project.buildingType);
    target.project.projectType = normalizeOptionText(target.project.projectType);
    if (typeof target.showRepairProcess === "boolean") {
      target.processDiagram = target.processDiagram || {};
      target.processDiagram.enabled = target.showRepairProcess;
    }
    target.processDiagram = normalizeProcessDiagram(target.processDiagram);
    delete target.showRepairProcess;
    target.assessment = target.assessment || clone(defaultState.assessment);
    target.assessment.items = normalizeAssessmentItems(target.assessment.items);
    if (!target.assessment.overall) target.assessment.overall = defaultState.assessment.overall;
    if (!target.assessment.urgency) target.assessment.urgency = defaultState.assessment.urgency;
    if (!target.assessment.policy) target.assessment.policy = defaultState.assessment.policy;
  }

  function normalizeAssessmentItems(items) {
    const incomingItems = Array.isArray(items) ? items : [];
    return defaultState.assessment.items.map((baseItem) => {
      const acceptedIds = [baseItem.id, ...(assessmentItemLegacyIds[baseItem.id] || [])];
      const incoming =
        incomingItems.find((item) => item && acceptedIds.includes(item.id)) ||
        incomingItems.find((item) => item && normalizeAssessmentLabel(item.label) === baseItem.label);
      const next = clone(baseItem);
      if (incoming) {
        next.value = incoming.value === "" || incoming.value == null ? "" : Math.max(1, Math.min(5, Number(incoming.value) || 1));
        next.displayText = safeText(incoming.displayText || incoming.labelText);
        next.memo = safeText(incoming.memo || incoming.note).slice(0, 35);
      }
      next.label = normalizeAssessmentLabel(next.label);
      return next;
    });
  }

  function normalizeCompanyContact(value) {
    const normalized = safeText(value)
      .replace(/・便利屋/g, "")
      .replace(/便利屋・/g, "")
      .replace(/\/\s*便利屋/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!normalized) return "";
    if (
      normalized === "岡山県内対応 / 外壁・屋根・防水・リフォーム" ||
      normalized === "岡山県内対応 / 外壁・屋根・防水・リフォーム・" ||
      normalized === "岡山県内対応 / 外壁・屋根・防水・リフォーム・便利屋"
    ) {
      return "岡山県内を中心に対応/屋根、外壁塗装・防水工事・リフォーム";
    }
    return normalized;
  }

  function normalizePriority(value) {
    const map = {
      "優先度 高": "high",
      "優先度 中": "medium",
      "優先度 低": "low",
      "早めに確認": "high",
      "早めに対処": "high",
      "経過確認": "medium",
      "今後の参考": "low",
      "経過観察": "low",
      "要確認": "medium",
      "状態確認": "medium",
      "清掃・調整": "cleaning",
      "補修検討": "repair",
      "補修を検討": "repair",
      "交換を検討": "replace",
      "早めに対応": "high",
      "早急な対応を検討": "urgent_review",
      "優先対応": "urgent",
      "優先して対応": "urgent",
    };
    if (!value) return "";
    if (priorities.some((item) => item.value === value)) return value;
    return map[value] || value;
  }

  function normalizeOptionText(value) {
    const map = {
      "シーリング": "シーリング（目地の防水材）",
      "付帯部": "付帯部（雨樋・破風など）",
      "軽度の傷み": "軽い傷み",
      "写真では判断しにくい": "写真だけでは判断しにくい",
    };
    return map[value] || value;
  }

  function normalizeConditionText(value) {
    const normalized = normalizeOptionText(value);
    const map = {
      "軽い傷み": "軽微な劣化",
      "軽度の傷み": "軽微な劣化",
      "傷みあり": "劣化・不具合が見られる",
      "劣化あり": "劣化・不具合が見られる",
      "補修推奨": "劣化・不具合が見られる",
      "早期対応推奨": "安全面の確認が必要",
      "良好": "問題なし",
      "写真だけでは判断しにくい": "",
      "写真では判断しにくい": "",
    };
    return map[normalized] ?? normalized;
  }

  function normalizeAssessmentLabel(value) {
    const map = {
      "環境の影響": "安全性",
      "周辺環境の影響": "安全性",
      "屋根のサビ": "使用上の支障",
      "塗膜劣化": "劣化・損傷の程度",
      "塗膜の劣化": "劣化・損傷の程度",
      "穴あき・腐食": "建物への影響",
      "雨どい・排水": "維持管理上の注意度",
      "雨樋・排水": "維持管理上の注意度",
    };
    return map[value] || value;
  }

  function createTimeOptions() {
    const options = [];
    for (let hour = 0; hour < 24; hour += 1) {
      ["00", "30"].forEach((minute) => {
        options.push(`${hour}:${minute}`);
      });
    }
    return options;
  }

  function svgEl(tag, props = {}, children = []) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(props || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
      else node.setAttribute(key === "className" ? "class" : key, value);
    });
    const childList = Array.isArray(children) ? children : [children];
    childList.forEach((child) => {
      if (child === null || child === undefined || child === "") return;
      if (child instanceof Node) node.appendChild(child);
      else node.appendChild(document.createTextNode(String(child)));
    });
    return node;
  }

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    let pendingValue;
    Object.entries(props || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (key === "className") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key === "style") node.setAttribute("style", value);
      else if (key === "value") pendingValue = value;
      else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value);
    });

    const childList = Array.isArray(children) ? children : [children];
    childList.forEach((child) => {
      if (child === null || child === undefined || child === "") return;
      if (child instanceof Node) node.appendChild(child);
      else node.appendChild(document.createTextNode(String(child)));
    });
    if (pendingValue !== undefined) node.value = pendingValue;
    return node;
  }
})();
