const categories = [
  "Tümü",
  "Faiz ve Nakit Akışı",
  "Bono ve Getiri Eğrisi",
  "Türev ve Hedge",
  "Duyarlılık",
  "VaR ve Simülasyon",
];

const state = {
  activeId: "simple-compound-interest",
  category: "Tümü",
  query: "",
  drafts: {},
};

const cleanNumber = (value) => {
  if (value === undefined || value === null) return 0;
  const parsed = Number(String(value).trim().replace(/\s/g, "").replace("%", "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const rate = (value) => cleanNumber(value) / 100;
const pow = (base, exponent) => (base > 0 ? Math.pow(base, exponent) : 0);
const list = (value) =>
  String(value || "")
    .split(/[;\n]+|,\s+/)
    .map(cleanNumber)
    .filter((item) => Number.isFinite(item));

const notationMap = {
  "P": "Başlangıç Anaparası / Nominal",
  "r": "Yıllık/Dönemsel Faiz Oranı",
  "t": "Vade (Yıl)",
  "m": "Bileşikleme/Yenileme Sıklığı",
  "FV": "Gelecek Değer",
  "PV": "Bugünkü Değer",
  "c": "Dönemsel Ödeme / Taksit",
  "T": "Vade veya Dönem Sayısı",
  "n": "Dönem/Taksit Sayısı",
  "S": "Spot Fiyat",
  "K": "Kullanım (Strike) Fiyatı",
  "σ": "Volatilite",
  "y": "Getiri Oranı (Yield)",
  "z": "Discount Margin (Spread)",
  "k": "Sermaye Çarpanı",
  "τ": "Yıl Fraksiyonu",
  "r Aylık": "Aylık Faiz Oranı",
  "r1": "Kısa Spot Faiz Oranı",
  "r2": "Uzun Spot Faiz Oranı",
  "r2 iskonto": "İskonto Oranı",
  "Discount Margin (z)": "Discount Margin (İskonto Marjı)",
  "LIBOR T1": "T1 LIBOR Oranı",
  "LIBOR T2": "T2 LIBOR Oranı",
  "VKGS": "Vadeye Kalan Gün Sayısı",
  "DCB": "Gün Sayım Esası (Day Count Basis)",
  "YTM": "Vadeye Kadar Getiri (Year to Maturity)",
  "vol": "Volatilite",
  "increment": "Faiz Değişim Adımı",
  "shock": "Faiz Şok Oranı",
  "spot": "Spot Fiyat (S)",
  "strike": "Kullanım Fiyatı (K)",
  "rate": "Faiz Oranı (r)",
  "time": "Vade/Süre (T)",
  "NPV": "Net Bugünkü Değer",
  "EAR": "Efektif Yıllık Faiz Oranı",
  "TF": "Tahakkuk Eden Faiz",
  "CP": "Temiz Fiyat (Clean Price)",
  "d1": "Black-Scholes d1 Katsayısı",
  "d2": "Black-Scholes d2 Katsayısı",
  "σPortföy": "Portföy Volatilitesi",
  "Macaulay D": "Macaulay Durasyonu",
  "Modifiye D": "Modifiye Durasyon",
  "VaR (1 Gün)": "1 Günlük Riske Maruz Değer",
  "VaR (10 Gün)": "10 Günlük Riske Maruz Değer",
  "Sermaye Gereksinimi": "Yasal Sermaye Yükümlülüğü",
};

const getEnhancedLabel = (item, module) => {
  let label = item.label;
  if (module && module.variables) {
    const matchedVar = module.variables.find(
      (v) => v.symbol.trim().toLowerCase() === label.trim().toLowerCase()
    );
    if (matchedVar) {
      return `${label} (${matchedVar.meaning.trim()})`;
    }
  }
  const trimmed = label.trim();
  if (notationMap[trimmed]) {
    return `${label} (${notationMap[trimmed]})`;
  }
  for (const [key, value] of Object.entries(notationMap)) {
    if (
      trimmed.toLowerCase() === key.toLowerCase() ||
      trimmed.toLowerCase().startsWith(key.toLowerCase() + " ") ||
      trimmed.toLowerCase().endsWith(" " + key.toLowerCase())
    ) {
      return `${label} (${value})`;
    }
  }
  return label;
};

const fmtNumber = (value, digits = 4) =>
  new Intl.NumberFormat("tr-TR", { maximumFractionDigits: digits }).format(Number.isFinite(value) ? value : 0);

const money = (value) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const pct = (value) => `${fmtNumber(value * 100, 4)}%`;
const bp = (value) => `${fmtNumber(value * 10000, 2)} bp`;

const plainPct = (value, digits = 4) => fmtNumber(value * 100, digits);

const erf = (x) => {
  const sign = x >= 0 ? 1 : -1;
  const abs = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * abs);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-abs * abs));
  return sign * y;
};

const normCdf = (x) => 0.5 * (1 + erf(x / Math.SQRT2));

const normInv = (p) => {
  if (p <= 0 || p >= 1) return 0;
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
};

const pmt = (rateValue, periods, presentValue) =>
  rateValue === 0
    ? presentValue / periods
    : (presentValue * rateValue) / (1 - 1 / pow(1 + rateValue, periods));

const linearInterpolate = (x, xs, ys) => {
  if (!xs.length || xs.length !== ys.length) return 0;
  if (x <= xs[0]) return ys[0];
  for (let i = 0; i < xs.length - 1; i += 1) {
    if (x <= xs[i + 1]) {
      const span = xs[i + 1] - xs[i];
      return span === 0 ? ys[i] : ys[i] + ((ys[i + 1] - ys[i]) * (x - xs[i])) / span;
    }
  }
  return ys[ys.length - 1];
};

const variables = (items) =>
  items.split("|").map((item) => {
    const [symbol, meaning] = item.split(":");
    return { symbol, meaning };
  });

const input = (key, label, defaultValue, suffix = "", type = "number", hint = "", limit = null, options = null) => ({
  key,
  label,
  defaultValue,
  suffix,
  type,
  hint,
  limit,
  options,
});

const result = (label, value) => ({ label, value });

const isListInput = (item) => item.type === "text" && String(item.defaultValue).includes(";");
const splitListItems = (value) =>
  String(value || "")
    .split(/[;\n]+|,\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
const joinListItems = (items) => items.map((item) => String(item).trim()).filter(Boolean).join("; ");

const setDraftValue = (module, key, value) => {
  state.drafts[module.id] = { ...(state.drafts[module.id] || {}), [key]: value };
};

const bondFlows = (face, couponRate, maturity, frequency) => {
  const periods = Math.max(1, Math.round(maturity * frequency));
  const coupon = (face * couponRate) / frequency;
  return Array.from({ length: periods }, (_, index) => ({
    period: index + 1,
    time: (index + 1) / frequency,
    cashFlow: index + 1 === periods ? coupon + face : coupon,
  }));
};

const bondPrice = (face, couponRate, yieldRate, maturity, frequency) => {
  const discount = 1 + yieldRate / frequency;
  return bondFlows(face, couponRate, maturity, frequency).reduce(
    (sum, flow) => sum + flow.cashFlow / pow(discount, flow.period),
    0,
  );
};

const macaulay = (face, couponRate, yieldRate, maturity, frequency) => {
  const flows = bondFlows(face, couponRate, yieldRate === 0 ? maturity : maturity, frequency);
  const discount = 1 + yieldRate / frequency;
  const price = flows.reduce((sum, flow) => sum + flow.cashFlow / pow(discount, flow.period), 0);
  const weighted = flows.reduce((sum, flow) => sum + flow.time * (flow.cashFlow / pow(discount, flow.period)), 0);
  return price === 0 ? 0 : weighted / price;
};

const convexity = (face, couponRate, yieldRate, maturity, frequency) => {
  const discount = 1 + yieldRate / frequency;
  const flows = bondFlows(face, couponRate, maturity, frequency);
  const price = bondPrice(face, couponRate, yieldRate, maturity, frequency);
  const raw = flows.reduce(
    (sum, flow) =>
      sum + (flow.cashFlow * flow.period * (flow.period + 1)) / pow(discount, flow.period + 2),
    0,
  );
  return price === 0 ? 0 : raw / (price * frequency * frequency);
};

const modules = [
  {
    id: "simple-compound-interest",
    title: "Basit Faiz & Bileşik Faiz",
    category: "Faiz ve Nakit Akışı",
    description: "Nominal tutarın zaman içinde basit faiz ve bileşik faizle nasıl büyüdüğünü karşılaştırır.",
    formula: ["Basit: FV = P x (1 + r x t)", "Bileşik: FV = P x (1 + r / m)^(m x t)"],
    variables: variables("P:Başlangıç anaparası|r:Yıllık faiz oranı|t:Yıl cinsinden vade|m:Yıl içindeki bileşikleme frekansı"),
    inputs: [input("principal", "Anapara", "100000", "TL"), input("rate", "Yıllık faiz", "45", "%"), input("time", "Vade", "1", "yıl"), input("frequency", "Bileşikleme", "12", "kez/yıl")],
    insight: "Bileşik faiz, faizin de faiz kazanması nedeniyle aynı nominal oranda daha yüksek gelecek değer üretir.",
    calc: (v) => {
      const p = cleanNumber(v.principal), r = rate(v.rate), t = cleanNumber(v.time), m = Math.max(1, cleanNumber(v.frequency));
      const simple = p * (1 + r * t), compound = p * pow(1 + r / m, m * t);
      return [result("Basit faiz FV", money(simple)), result("Bileşik faiz FV", money(compound)), result("Fark", money(compound - simple))];
    },
  },
  {
    id: "compounding-frequency",
    title: "Yenileme Frekansı",
    category: "Faiz ve Nakit Akışı",
    description: "Nominal faizin yılda kaç kez yenilendiğine göre efektif yıllık getiriyi ve gelecek değeri hesaplar.",
    formula: ["EAR = (1 + r / m)^m - 1", "FV = P x (1 + EAR)^t"],
    variables: variables("EAR:Efektif yıllık faiz oranı|r:Nominal yıllık faiz oranı|m:Yıllık yenileme sayısı|t:Yıl cinsinden yatırım süresi"),
    inputs: [input("principal", "Tutar", "100000", "TL"), input("rate", "Nominal faiz", "42", "%"), input("frequency", "Yenileme frekansı", "12", "kez/yıl"), input("time", "Süre", "1", "yıl")],
    insight: "Frekans arttıkça efektif getiri yükselir; artış sürekli faize yaklaştıkça yavaşlar.",
    calc: (v) => {
      const p = cleanNumber(v.principal), r = rate(v.rate), m = Math.max(1, cleanNumber(v.frequency)), t = cleanNumber(v.time);
      const ear = pow(1 + r / m, m) - 1;
      return [result("Efektif yıllık faiz", pct(ear)), result("Gelecek değer", money(p * pow(1 + ear, t)))];
    },
  },
  {
    id: "present-value",
    title: "Bugünkü Değer",
    category: "Faiz ve Nakit Akışı",
    description: "Gelecekte alınacak tek bir nakit akışını iskonto ederek bugünkü ekonomik değerine indirger.",
    formula: ["PV = FV / (1 + r / m)^(m x t)"],
    variables: variables("PV:Bugünkü değer|FV:Gelecek değer|r:Yıllık iskonto oranı|m:Yıl içindeki iskonto frekansı"),
    inputs: [input("future", "Gelecek değer", "150000", "TL"), input("rate", "İskonto oranı", "35", "%"), input("time", "Vade", "2", "yıl"), input("frequency", "Frekans", "1", "kez/yıl")],
    insight: "İskonto oranı yükseldikçe gelecekteki nakdin bugünkü değeri düşer.",
    calc: (v) => [result("Bugünkü değer", money(cleanNumber(v.future) / pow(1 + rate(v.rate) / Math.max(1, cleanNumber(v.frequency)), Math.max(1, cleanNumber(v.frequency)) * cleanNumber(v.time))))],
  },
  {
    id: "multi-cash-flow",
    title: "Çoklu Nakit Akışı",
    category: "Faiz ve Nakit Akışı",
    description: "Birden fazla dönem nakit akışını aynı iskonto oranıyla bugünkü değere indirger.",
    formula: ["PV = Σ CF_t / (1 + r)^t", "NPV = -I0 + Σ CF_t / (1 + r)^t"],
    variables: variables("CF_t:t dönemindeki nakit akışı|r:Dönemsel iskonto oranı|I0:Başlangıç yatırımı|t:Nakit akışının gerçekleştiği dönem"),
    inputs: [input("initial", "Başlangıç çıkışı", "50000", "TL"), input("flows", "Nakit akışları", "15000; 18000; 22000; 26000", "", "text", "Her nakit akışını ayrı kutuya yaz."), input("rate", "Dönemsel iskonto", "8", "%")],
    insight: "Pozitif NPV, iskonto oranı dikkate alındığında projenin ekonomik değer yarattığını gösterir.",
    calc: (v) => {
      const flows = list(v.flows), r = rate(v.rate);
      const pv = flows.reduce((sum, cf, index) => sum + cf / pow(1 + r, index + 1), 0);
      return [result("Nakit akışları PV", money(pv)), result("NPV", money(pv - cleanNumber(v.initial))), result("Dönem sayısı", fmtNumber(flows.length, 0))];
    },
  },
  {
    id: "annuity",
    title: "Annuite",
    category: "Faiz ve Nakit Akışı",
    description: "Her dönem eşit tutarlı ödeme veya tahsilat serisinin bugünkü ve gelecek değerini hesaplar.",
    formula: ["PV = PMT x [1 - (1 + r)^(-n)] / r", "FV = PMT x [(1 + r)^n - 1] / r"],
    variables: variables("PMT:Her dönem yapılan eşit ödeme|r:Dönemsel faiz oranı|n:Toplam dönem sayısı|PV/FV:Bugünkü değer / gelecek değer"),
    inputs: [input("payment", "Dönemsel ödeme", "10000", "TL"), input("rate", "Dönemsel faiz", "3", "%"), input("periods", "Dönem sayısı", "12")],
    insight: "Annuite mantığı kredi, leasing, düzenli kupon ve emeklilik ödemelerinde temel yapı taşıdır.",
    calc: (v) => {
      const pmt = cleanNumber(v.payment), r = rate(v.rate), n = cleanNumber(v.periods);
      const pv = r === 0 ? pmt * n : pmt * (1 - pow(1 + r, -n)) / r;
      const fv = r === 0 ? pmt * n : pmt * (pow(1 + r, n) - 1) / r;
      return [result("Bugünkü değer", money(pv)), result("Gelecek değer", money(fv))];
    },
  },
  {
    id: "perpetuity",
    title: "Perpetuity",
    category: "Faiz ve Nakit Akışı",
    description: "Sonsuza kadar devam ettiği varsayılan nakit akışının bugünkü değerini hesaplar.",
    formula: ["Durağan: PV = C / r", "Büyüyen: PV = C1 / (r - g)"],
    variables: variables("C veya C1:Sabit veya bir sonraki dönem nakit akışı|r:İskonto oranı|g:Sürekli büyüme oranı|PV:Sonsuz nakit akışı bugünkü değeri"),
    inputs: [input("cash", "Dönemsel nakit akışı", "10000", "TL"), input("rate", "İskonto oranı", "18", "%"), input("growth", "Büyüme oranı", "5", "%")],
    insight: "Büyüme oranı iskonto oranına yaklaştıkça değer çok hızlı yükselir; r > g koşulu kritiktir.",
    calc: (v) => {
      const c = cleanNumber(v.cash), r = rate(v.rate), g = rate(v.growth);
      return [result("Durağan perpetuity", money(r === 0 ? 0 : c / r)), result("Büyüyen perpetuity", money(r <= g ? 0 : c / (r - g)))];
    },
  },
  {
    id: "amortization",
    title: "Amortizasyon",
    category: "Faiz ve Nakit Akışı",
    description: "Eşit ödemeli borçta seçilen dönemin faiz, anapara ve kalan bakiye kırılımını verir.",
    formula: ["PMT = L x r / [1 - (1 + r)^(-n)]", "Faiz_t = Bakiye_(t-1) x r"],
    variables: variables("L:Kredi anaparası|r:Dönemsel faiz oranı|n:Toplam dönem sayısı|Bakiye:Dönem başı kalan borç"),
    inputs: [input("loan", "Kredi tutarı", "500000", "TL"), input("rate", "Dönemsel faiz", "3.2", "%"), input("periods", "Toplam dönem", "24"), input("selected", "İncelenen dönem", "6")],
    insight: "İlk dönemlerde ödemenin faiz payı yüksek, son dönemlerde anapara payı daha yüksektir.",
    calc: (v) => {
      const loan = cleanNumber(v.loan), r = rate(v.rate), n = Math.max(1, cleanNumber(v.periods));
      const selected = Math.min(Math.max(1, Math.round(cleanNumber(v.selected))), n);
      const pmt = r === 0 ? loan / n : loan * r / (1 - pow(1 + r, -n));
      let balance = loan, interest = 0, principal = 0;
      for (let i = 1; i <= selected; i += 1) {
        interest = balance * r;
        principal = pmt - interest;
        balance -= principal;
      }
      return [result("Eşit ödeme", money(pmt)), result(`${selected}. dönem faiz`, money(interest)), result(`${selected}. dönem anapara`, money(principal)), result("Kalan bakiye", money(Math.max(0, balance)))];
    },
  },
  {
    id: "level-payment-loan",
    title: "Eşit Taksitli Kredi",
    category: "Faiz ve Nakit Akışı",
    description: "Aylık eşit taksitli kredi için taksit, toplam geri ödeme ve toplam faiz yükünü hesaplar.",
    formula: ["Taksit = L x i / [1 - (1 + i)^(-n)]", "i = yıllık faiz / 12"],
    variables: variables("L:Kredi tutarı|i:Aylık faiz oranı|n:Ay cinsinden vade|Taksit:Her ay ödenecek eşit tutar"),
    inputs: [input("loan", "Kredi tutarı", "750000", "TL"), input("annualRate", "Yıllık faiz", "42", "%"), input("months", "Vade", "36", "ay")],
    insight: "Taksit formülü bankacılıkta annuite formülünün aylık kredi kullanımına uyarlanmış halidir.",
    calc: (v) => {
      const loan = cleanNumber(v.loan), i = rate(v.annualRate) / 12, n = Math.max(1, cleanNumber(v.months));
      const pmt = i === 0 ? loan / n : loan * i / (1 - pow(1 + i, -n));
      return [result("Aylık taksit", money(pmt)), result("Toplam geri ödeme", money(pmt * n)), result("Toplam faiz", money(pmt * n - loan))];
    },
  },
  {
    id: "continuous-compounding",
    title: "Basit, Bileşik ve Sürekli Faiz",
    category: "Faiz ve Nakit Akışı",
    description: "Kaynak dosyadaki gibi PV, FV ve gün sayısından basit, bileşik ve sürekli faiz oranlarını türetir.",
    formula: ["T = gün / 360", "Basit = (FV / PV - 1) / T", "Bileşik = (FV / PV)^(1 / T) - 1", "Sürekli = -LN(PV / FV) / T"],
    variables: variables("PV:Bugünkü değer|FV:Gelecek değer|T:Yıl cinsinden vade|LN:Doğal logaritma"),
    inputs: [input("present", "PV", "99.32"), input("future", "FV", "100"), input("days", "Gün", "14", "gün")],
    insight: "Bu modül faiz tipleri arasındaki dönüşümü gösterir; . modüldeki oran dönüşüm mantığıyla uyumludur.",
    calc: (v) => {
      const pv = cleanNumber(v.present), fv = cleanNumber(v.future), t = cleanNumber(v.days) / 360;
      const ratio = pv === 0 ? 0 : fv / pv;
      return [
        result("Basit", pct(t === 0 ? 0 : (ratio - 1) / t)),
        result("Bileşik", pct(t === 0 ? 0 : pow(ratio, 1 / t) - 1)),
        result("Sürekli", pct(t === 0 || fv === 0 ? 0 : -Math.log(pv / fv) / t)),
      ];
    },
  },
  {
    id: "zero-coupon-bond",
    title: "Kuponsuz Bono",
    category: "Bono ve Getiri Eğrisi",
    description: "Kaynak dosyadaki para piyasası iskonto yaklaşımıyla kuponsuz bononun PV değerini hesaplar.",
    formula: ["VKGS = Vade Tarihi - Portföy Tarihi", "PV = Nominal / (1 + VKGS x r / 365)", "r = (Nominal / PV - 1) x 365 / VKGS"],
    variables: variables("PV:Kuponsuz bono bugünkü değeri|VKGS:Vadeye kalan gün sayısı|r:Yıllık faiz oranı|Nominal:Vade sonunda ödenecek tutar"),
    inputs: [input("face", "Nominal", "100", "TL"), input("days", "Vadeye kalan gün sayısı", "364", "gün"), input("yield", "Faiz oranı", "8.63", "%"), input("marketPrice", "Piyasa fiyatı", "92.06", "TL")],
    insight: ". modül bileşik vade yerine gün sayısı bazlı basit iskonto kullanır; bu modül aynı mantıkla çalışır.",
    calc: (v) => {
      const f = cleanNumber(v.face), days = cleanNumber(v.days), y = rate(v.yield), market = cleanNumber(v.marketPrice);
      const price = f / (1 + days * (y / 365));
      const implied = days === 0 || market === 0 ? 0 : (f / market - 1) * (365 / days);
      return [result("PV", money(price)), result("Piyasa fiyatından faiz", pct(implied))];
    },
  },
  {
    id: "cash-flow",
    title: "Cash Flow",
    category: "Faiz ve Nakit Akışı",
    description: "Nakit akışı listesinin toplamını, iskonto edilmiş değerini ve ağırlıklı ortalama vadesini özetler.",
    formula: ["Toplam CF = Σ CF_t", "Ağırlıklı vade = Σ(t x CF_t) / Σ CF_t"],
    variables: variables("CF_t:t dönemindeki nakit akışı|r:Dönemsel iskonto oranı|t:Dönem numarası|Σ:Tüm dönemlerin toplamı"),
    inputs: [input("flows", "Nakit akışları", "10000; -3000; 15000; 18000", "", "text", "Her nakit akışını ayrı kutuya yaz."), input("rate", "Dönemsel iskonto", "4", "%")],
    insight: "Bu modül nakit akışının sadece toplamını değil, zaman değerini de görünür yapar.",
    calc: (v) => {
      const flows = list(v.flows), r = rate(v.rate);
      const total = flows.reduce((sum, item) => sum + item, 0);
      const pv = flows.reduce((sum, item, index) => sum + item / pow(1 + r, index + 1), 0);
      const weighted = total === 0 ? 0 : flows.reduce((sum, item, index) => sum + (index + 1) * item, 0) / total;
      return [result("Toplam nakit akışı", money(total)), result("Bugünkü değer", money(pv)), result("Ağırlıklı vade", `${fmtNumber(weighted, 2)} dönem`)];
    },
  },
  {
    id: "coupon-bond",
    title: "Kuponlu Bono",
    category: "Bono ve Getiri Eğrisi",
    description: "Sabit kuponlu bonoda tüm kuponların ve anaparanın iskonto edilmiş toplam fiyatını hesaplar.",
    formula: ["P = Σ C / (1 + y / m)^i + F / (1 + y / m)^n", "C = F x c / m"],
    variables: variables("C:Dönemsel kupon ödemesi|F:Nominal değer|c:Yıllık kupon oranı|y:Yıllık getiri oranı"),
    inputs: [input("face", "Nominal değer", "100000", "TL"), input("coupon", "Kupon oranı", "30", "%"), input("yield", "Getiri", "34", "%"), input("maturity", "Vade", "3", "yıl"), input("frequency", "Kupon frekansı", "2", "kez/yıl")],
    insight: "Kupon oranı piyasa getirisinin altındaysa bono genellikle iskontolu, üstündeyse primli fiyatlanır.",
    calc: (v) => {
      const face = cleanNumber(v.face), c = rate(v.coupon), y = rate(v.yield), t = cleanNumber(v.maturity), f = Math.max(1, cleanNumber(v.frequency));
      const price = bondPrice(face, c, y, t, f);
      return [result("Bono fiyatı", money(price)), result("Dönemsel kupon", money((face * c) / f)), result("Cari getiri", pct((face * c) / price))];
    },
  },
  {
    id: "forward-rate",
    title: "Forward Rate",
    category: "Bono ve Getiri Eğrisi",
    description: "İki spot faiz noktasından, aradaki dönem için ima edilen forward faiz oranını hesaplar.",
    formula: ["1 + f(t1,t2) = [(1 + s2)^t2 / (1 + s1)^t1]^(1 / (t2 - t1))"],
    variables: variables("s1:Kısa vadeli spot faiz|s2:Uzun vadeli spot faiz|t1, t2:Spot faizlerin vadeleri|f:İma edilen forward faiz"),
    inputs: [input("spot1", "Kısa spot", "32", "%"), input("t1", "Kısa vade", "1", "yıl"), input("spot2", "Uzun spot", "28", "%"), input("t2", "Uzun vade", "2", "yıl")],
    insight: "Forward oran, bugünkü getiri eğrisinin gelecekteki dönem için ima ettiği faiz seviyesidir.",
    calc: (v) => {
      const s1 = rate(v.spot1), s2 = rate(v.spot2), t1 = cleanNumber(v.t1), t2 = cleanNumber(v.t2);
      const f = t2 <= t1 ? 0 : pow(pow(1 + s2, t2) / pow(1 + s1, t1), 1 / (t2 - t1)) - 1;
      return [result("Forward faiz", pct(f))];
    },
  },
  {
    id: "forward-rate-contract",
    title: "Forward Rate Sözleşmesi",
    category: "Türev ve Hedge",
    description: "Bu modüldeki FRA mantığıyla sabit ödeme, değişken forward ödeme ve bugünkü kontrat değerini hesaplar.",
    formula: ["f = ((1 + r2)^T2 / (1 + r1)^T1) - 1", "τ = T2 - T1", "P = N x (f - K) x τ x e^(-r_d x T2)"],
    variables: variables("N:Nominal tutar|K:Sabit ödeme oranı|r1, r2:İlgili vadelerdeki spot/LIBOR oranları|τ:Sözleşme dönemi uzunluğu"),
    inputs: [input("notional", "Nominal", "1000000", "TL"), input("fixed", "Sabit Ödeme", "8.5", "%"), input("r1", "r1", "8.434", "%"), input("t1", "T1", "1", "yıl"), input("r2", "r2", "8.8", "%"), input("t2", "T2", "2", "yıl"), input("discount", "r2 iskonto", "0", "%")],
    insight: "Bu sürüm kur forwardı değil, kaynak modeldeki forward rate sözleşmesi yani faiz forwardı mantığıyla çalışır.",
    calc: (v) => {
      const n = cleanNumber(v.notional), fixed = rate(v.fixed), r1 = rate(v.r1), r2 = rate(v.r2), t1 = cleanNumber(v.t1), t2 = cleanNumber(v.t2), discount = rate(v.discount);
      const forward = pow(1 + r2, t2) / pow(1 + r1, t1) - 1;
      const tau = t2 - t1;
      return [
        result("Değişken Ödeme", pct(forward)),
        result("τ", fmtNumber(tau, 4)),
        result("P", money(n * (forward - fixed) * tau * Math.exp(-discount * t2))),
      ];
    },
  },
  {
    id: "floating-rate-note",
    title: "Değişken Faizli Bono",
    category: "Bono ve Getiri Eğrisi",
    description: "Endeks faizine spread eklenen değişken faizli bonoda dönem kuponu ve yaklaşık fiyatı hesaplar.",
    formula: ["Kupon = F x (L + s) x Δ", "P = Σ Kupon_t / (1 + d x Δ)^t + F / (1 + d x Δ)^n"],
    variables: variables("L:Referans faiz oranı|s:Sözleşme spreadi|d:İskonto marjı veya piyasa getirisi|Δ:Kupon dönem uzunluğu"),
    inputs: [input("face", "Nominal", "100000", "TL"), input("indexRate", "Referans faiz", "36", "%"), input("spread", "Sözleşme spreadi", "2.5", "%"), input("discount", "İskonto marjı", "39", "%"), input("periods", "Kalan dönem", "4"), input("delta", "Dönem uzunluğu", "0.25", "yıl")],
    insight: "Değişken faizli bonoda kupon piyasa faizine uyum sağladığı için fiyat genellikle nominale daha yakın seyreder.",
    calc: (v) => {
      const face = cleanNumber(v.face), couponRate = rate(v.indexRate) + rate(v.spread), discount = rate(v.discount), periods = Math.max(1, cleanNumber(v.periods)), delta = cleanNumber(v.delta);
      const coupon = face * couponRate * delta;
      const price = Array.from({ length: periods }, (_, i) => i + 1).reduce((sum, item) => sum + coupon / pow(1 + discount * delta, item), face / pow(1 + discount * delta, periods));
      return [result("Dönem kuponu", money(coupon)), result("Yaklaşık fiyat", money(price))];
    },
  },
  {
    id: "spread",
    title: "Spread",
    category: "Bono ve Getiri Eğrisi",
    description: "Riskli enstrüman getirisi ile risksiz benchmark getirisi arasındaki farkı baz puan cinsinden gösterir.",
    formula: ["Spread = y_riskli - y_risksiz", "All-in spread = kredi + likidite + baz spread"],
    variables: variables("y_riskli:Şirket bonosu veya riskli varlık getirisi|y_risksiz:Benchmark veya devlet tahvili getirisi|bp:Baz puan; 1 bp = 0,01%|All-in:Toplam fiyatlama farkı"),
    inputs: [input("risky", "Riskli getiri", "41.5", "%"), input("riskfree", "Benchmark getiri", "35", "%"), input("liquidity", "Likidite spreadi", "0.75", "%"), input("basis", "Baz spread", "0.25", "%")],
    insight: "Spread, kredi riski ve likidite primi gibi risk bileşenlerinin piyasa fiyatına yansımasını özetler.",
    calc: (v) => {
      const raw = rate(v.risky) - rate(v.riskfree), allIn = raw + rate(v.liquidity) + rate(v.basis);
      return [result("Temel spread", bp(raw)), result("All-in spread", bp(allIn))];
    },
  },
  {
    id: "corporate-zero",
    title: "Kuponsuz Şirket Bonosu",
    category: "Bono ve Getiri Eğrisi",
    description: "Bu modüldeki gibi rating bazlı faiz farkını gün sayılı kuponsuz bono fiyatına yansıtır.",
    formula: ["PV = Nominal / (1 + VKGS x r / 365)", "Spread Etkisi = PV_düşük_getiri / PV_yüksek_getiri - 1"],
    variables: variables("PV:Bugünkü değer|VKGS:Vadeye kalan gün sayısı|r:Ratinge göre kullanılan yıllık faiz|Nominal:Vade sonu ödeme"),
    inputs: [input("face", "Nominal", "100", "TL"), input("days", "Vadeye kalan gün sayısı", "365", "gün"), input("yieldA", "Industrial A Verim", "0.376", "%"), input("yieldBBB", "Industrial BBB- Verim", "1.022", "%")],
    insight: "Bu modül bileşik yıllık iskonto yerine kaynak modeldeki gün sayılı kuponsuz şirket bonosu formülünü kullanır.",
    calc: (v) => {
      const face = cleanNumber(v.face), days = cleanNumber(v.days), yA = rate(v.yieldA), yBBB = rate(v.yieldBBB);
      const priceA = face / (1 + days * (yA / 365));
      const priceBBB = face / (1 + days * (yBBB / 365));
      return [result("Industrial A PV", money(priceA)), result("Industrial BBB- PV", money(priceBBB)), result("Spread etkisi", pct(priceA / priceBBB - 1))];
    },
  },
  {
    id: "corporate-floating",
    title: "Değişken Faizli Şirket Bonosu",
    category: "Bono ve Getiri Eğrisi",
    description: "Değişken faizli şirket bonosunda referans faiz, kredi spreadi ve iskonto marjını birlikte fiyatlar.",
    formula: ["Kupon = F x (L + s_kredi) x Δ", "P = Σ Kupon_t / (1 + (L + DM) x Δ)^t + F / (...)^n"],
    variables: variables("L:Referans piyasa faizi|s_kredi:Şirketin kredi spreadi|DM:Discount margin|Δ:Kupon dönem uzunluğu"),
    inputs: [input("face", "Nominal", "100000", "TL"), input("indexRate", "Referans faiz", "36", "%"), input("creditSpread", "Kredi spreadi", "5", "%"), input("discountMargin", "Discount margin", "6", "%"), input("periods", "Kalan dönem", "4"), input("delta", "Dönem uzunluğu", "0.25", "yıl")],
    insight: "Sözleşme spreadi piyasa discount margininin altına düştükçe bono fiyatı nominalin altına kayar.",
    calc: (v) => {
      const face = cleanNumber(v.face), couponRate = rate(v.indexRate) + rate(v.creditSpread), discountRate = rate(v.indexRate) + rate(v.discountMargin), periods = Math.max(1, cleanNumber(v.periods)), delta = cleanNumber(v.delta);
      const coupon = face * couponRate * delta;
      const price = Array.from({ length: periods }, (_, i) => i + 1).reduce((sum, item) => sum + coupon / pow(1 + discountRate * delta, item), face / pow(1 + discountRate * delta, periods));
      return [result("Dönem kuponu", money(coupon)), result("Şirket FRN fiyatı", money(price))];
    },
  },
  {
    id: "swap",
    title: "Swap",
    category: "Türev ve Hedge",
    description: "Plain vanilla faiz swapında sabit ve değişken bacak arasındaki yaklaşık bugünkü değer farkını hesaplar.",
    formula: ["PV_swap = N x (R_float - R_fixed) x A", "A = Σ Δ / (1 + d x Δ)^t"],
    variables: variables("N:Swap nominali|R_fixed:Sabit bacak oranı|R_float:Beklenen değişken bacak oranı|A:İskontolu annuite faktörü"),
    inputs: [input("notional", "Nominal", "10000000", "TL"), input("fixed", "Sabit oran", "34", "%"), input("floating", "Değişken oran", "38", "%"), input("discount", "İskonto oranı", "35", "%"), input("maturity", "Vade", "2", "yıl"), input("frequency", "Ödeme frekansı", "4", "kez/yıl")],
    insight: "Sonuç pozitifse değişken faiz alan, sabit faiz ödeyen taraf için değer yaratır.",
    calc: (v) => {
      const n = cleanNumber(v.notional), fixed = rate(v.fixed), floating = rate(v.floating), d = rate(v.discount), maturity = cleanNumber(v.maturity), f = Math.max(1, cleanNumber(v.frequency));
      const periods = Math.max(1, Math.round(maturity * f)), delta = 1 / f;
      const annuity = Array.from({ length: periods }, (_, i) => i + 1).reduce((sum, item) => sum + delta / pow(1 + d * delta, item), 0);
      return [result("Annuite faktörü", fmtNumber(annuity, 6)), result("Swap yaklaşık PV", money(n * (floating - fixed) * annuity))];
    },
  },
  {
    id: "linear-interpolation",
    title: "Lineer İnterpolasyon",
    category: "Bono ve Getiri Eğrisi",
    description: "İki bilinen vade noktası arasındaki ara getiri, iskonto oranı veya spread değerini doğrusal olarak tahmin eder.",
    formula: ["y = y1 + (y2 - y1) x (x - x1) / (x2 - x1)"],
    variables: variables("x:Tahmin edilecek ara nokta|x1, x2:Bilinen iki vade veya nokta|y1, y2:Bu noktalardaki bilinen oran/değer|y:İnterpole edilen değer"),
    inputs: [input("x1", "x1", "1"), input("y1", "y1", "32", "%"), input("x2", "x2", "3"), input("y2", "y2", "28", "%"), input("x", "Ara nokta", "2")],
    insight: "Lineer interpolasyon hızlı ve şeffaftır; eğrinin kıvrımlı olduğu piyasalarda daha gelişmiş yöntemlerle desteklenebilir.",
    calc: (v) => {
      const x1 = cleanNumber(v.x1), x2 = cleanNumber(v.x2), y1 = rate(v.y1), y2 = rate(v.y2), x = cleanNumber(v.x);
      return [result("İnterpole değer", pct(x2 === x1 ? y1 : y1 + (y2 - y1) * ((x - x1) / (x2 - x1))))];
    },
  },
  {
    id: "swaption",
    title: "Swaption",
    category: "Türev ve Hedge",
    description: "Black-76 yaklaşımıyla payer ve receiver swaption değerini hesaplar.",
    formula: ["Payer = N x A x [F x N(d1) - K x N(d2)]", "d1 = [ln(F / K) + 0,5σ²T] / (σ√T)"],
    variables: variables("N:Nominal tutar|A:Swap annuite faktörü|F:Forward swap oranı|K:Kullanım oranı"),
    inputs: [input("notional", "Nominal", "10000000", "TL"), input("annuity", "Annuite faktörü", "1.65"), input("forward", "Forward swap oranı", "35", "%"), input("strike", "Strike oranı", "33", "%"), input("vol", "Volatilite", "24", "%"), input("time", "Opsiyon vadesi", "1", "yıl")],
    insight: "Payer swaption faiz yükselişine, receiver swaption faiz düşüşüne karşı opsiyonel koruma sağlar.",
    calc: (v) => {
      const n = cleanNumber(v.notional), a = cleanNumber(v.annuity), f = rate(v.forward), k = rate(v.strike), sigma = rate(v.vol), t = cleanNumber(v.time);
      const denom = sigma * Math.sqrt(Math.max(t, 0.0001));
      const d1 = denom === 0 ? 0 : (Math.log(f / k) + 0.5 * sigma * sigma * t) / denom, d2 = d1 - denom;
      return [result("Payer swaption", money(n * a * (f * normCdf(d1) - k * normCdf(d2)))), result("Receiver swaption", money(n * a * (k * normCdf(-d2) - f * normCdf(-d1)))), result("d1 / d2", `${fmtNumber(d1, 4)} / ${fmtNumber(d2, 4)}`)];
    },
  },
  {
    id: "macaulay-duration",
    title: "Macaulay Durasyonu",
    category: "Duyarlılık",
    description: "Tahvil nakit akışlarının bugünkü değer ağırlıklı ortalama vadesini hesaplar.",
    formula: ["D_Mac = Σ[t x PV(CF_t)] / P"],
    variables: variables("D_Mac:Macaulay durasyonu|PV(CF_t):t dönemindeki nakit akışının bugünkü değeri|P:Tahvil fiyatı|t:Yıl cinsinden nakit akışı zamanı"),
    inputs: [input("face", "Nominal", "100000", "TL"), input("coupon", "Kupon oranı", "28", "%"), input("yield", "Getiri", "32", "%"), input("maturity", "Vade", "4", "yıl"), input("frequency", "Kupon frekansı", "2", "kez/yıl")],
    insight: "Macaulay durasyonu, tahvilin nakit akışı ağırlık merkezini yıl cinsinden verir.",
    calc: (v) => {
      const face = cleanNumber(v.face), c = rate(v.coupon), y = rate(v.yield), t = cleanNumber(v.maturity), f = Math.max(1, cleanNumber(v.frequency));
      return [result("Macaulay durasyonu", `${fmtNumber(macaulay(face, c, y, t, f), 4)} yıl`), result("Tahvil fiyatı", money(bondPrice(face, c, y, t, f)))];
    },
  },
  {
    id: "modified-duration",
    title: "Modifiye Durasyon ve Bono Fiyatı",
    category: "Duyarlılık",
    description: "Faiz değişimine karşı tahvil fiyatının yaklaşık yüzde hassasiyetini hesaplar.",
    formula: ["D_Mod = D_Mac / (1 + y / m)", "ΔP / P ≈ -D_Mod x Δy"],
    variables: variables("D_Mod:Modifiye durasyon|D_Mac:Macaulay durasyonu|y:Yıllık getiri|m:Kupon frekansı"),
    inputs: [input("macaulay", "Macaulay durasyon", "2.85", "yıl"), input("yield", "Getiri", "32", "%"), input("frequency", "Frekans", "2", "kez/yıl"), input("shock", "Faiz şoku", "1", "%")],
    insight: "Modifiye durasyon, küçük faiz hareketleri için fiyat etkisini hızlıca tahmin eder.",
    calc: (v) => {
      const modified = cleanNumber(v.macaulay) / (1 + rate(v.yield) / Math.max(1, cleanNumber(v.frequency)));
      return [result("Modifiye durasyon", `${fmtNumber(modified, 4)} yıl`), result("Yaklaşık fiyat etkisi", pct(-modified * rate(v.shock)))];
    },
  },
  {
    id: "portfolio-duration",
    title: "Portföy Durasyonu",
    category: "Duyarlılık",
    description: "Portföydeki enstrüman ağırlıkları ve durasyonlarıyla toplam portföy durasyonunu hesaplar.",
    formula: ["D_p = Σ w_i x D_i"],
    variables: variables("D_p:Portföy durasyonu|w_i:i enstrümanının portföy ağırlığı|D_i:i enstrümanının durasyonu|Σw_i:Ağırlık toplamı; normalize edilebilir"),
    inputs: [input("weights", "Ağırlıklar", "0.35; 0.40; 0.25", "", "text"), input("durations", "Durasyonlar", "1.8; 3.2; 5.4", "", "text")],
    insight: "Portföy durasyonu, faiz riski limitlerinde ve hedge büyüklüğü hesaplarında pratik bir özet metriktir.",
    calc: (v) => {
      const weights = list(v.weights), durations = list(v.durations), total = weights.reduce((sum, item) => sum + item, 0) || 1;
      const portfolio = durations.reduce((sum, item, index) => sum + ((weights[index] || 0) / total) * item, 0);
      return [result("Portföy durasyonu", `${fmtNumber(portfolio, 4)} yıl`), result("Normalize ağırlık toplamı", fmtNumber(total, 4))];
    },
  },
  {
    id: "convexity",
    title: "Konveksite",
    category: "Duyarlılık",
    description: "Tahvil fiyat-faiz ilişkisinin eğriliğini ölçerek durasyon tahminini ikinci derece düzeltir.",
    formula: ["C = [Σ CF_t x t x (t + 1) / (1 + y)^(t + 2)] / P"],
    variables: variables("C:Konveksite|CF_t:Nakit akışı|y:Dönemsel getiri|P:Tahvil fiyatı"),
    inputs: [input("face", "Nominal", "100000", "TL"), input("coupon", "Kupon oranı", "28", "%"), input("yield", "Getiri", "32", "%"), input("maturity", "Vade", "4", "yıl"), input("frequency", "Frekans", "2", "kez/yıl")],
    insight: "Konveksite özellikle büyük faiz şoklarında durasyon hesabının eksik kaldığı alanı tamamlar.",
    calc: (v) => {
      const face = cleanNumber(v.face), c = rate(v.coupon), y = rate(v.yield), t = cleanNumber(v.maturity), f = Math.max(1, cleanNumber(v.frequency));
      return [result("Konveksite", fmtNumber(convexity(face, c, y, t, f), 4)), result("Fiyat", money(bondPrice(face, c, y, t, f)))];
    },
  },
  {
    id: "price-impact",
    title: "Fiyat Etkisi",
    category: "Duyarlılık",
    description: "Durasyon ve konveksite kullanarak faiz şokunun tahvil fiyatına yaklaşık etkisini hesaplar.",
    formula: ["ΔP / P ≈ -D_Mod x Δy + 0,5 x C x (Δy)^2"],
    variables: variables("D_Mod:Modifiye durasyon|C:Konveksite|Δy:Faiz değişimi|P:Başlangıç fiyatı"),
    inputs: [input("price", "Başlangıç fiyatı", "95000", "TL"), input("duration", "Modifiye durasyon", "2.7"), input("convexity", "Konveksite", "9.5"), input("shock", "Faiz şoku", "1", "%")],
    insight: "Faiz artışı için durasyon fiyatı düşürür; konveksite bu düşüşü ikinci derece olarak düzeltir.",
    calc: (v) => {
      const p = cleanNumber(v.price), impact = -cleanNumber(v.duration) * rate(v.shock) + 0.5 * cleanNumber(v.convexity) * rate(v.shock) ** 2;
      return [result("Yüzde fiyat etkisi", pct(impact)), result("Tutar etkisi", money(p * impact)), result("Yeni fiyat", money(p * (1 + impact)))];
    },
  },
  {
    id: "bond-price-convergence",
    title: "Bono Fiyatı Yakınsaması",
    category: "Bono ve Getiri Eğrisi",
    description: "Getiri sabit varsayımı altında vade kısaldıkça bono fiyatının nominal değere doğru yakınsamasını gösterir.",
    formula: ["P_t = Σ C / (1 + y / m)^i + F / (1 + y / m)^n"],
    variables: variables("P_t:t zamanındaki teorik bono fiyatı|F:Nominal değer|C:Dönemsel kupon|y:Sabit varsayılan piyasa getirisi"),
    inputs: [input("face", "Nominal", "100000", "TL"), input("coupon", "Kupon oranı", "25", "%"), input("yield", "Getiri", "32", "%"), input("maturity", "Başlangıç vade", "4", "yıl"), input("after", "Geçen süre", "1", "yıl"), input("frequency", "Frekans", "2", "kez/yıl")],
    insight: "Vade sonuna yaklaştıkça fiyat, kupon etkisi dışında nominal geri ödemeye yaklaşır.",
    calc: (v) => {
      const face = cleanNumber(v.face), c = rate(v.coupon), y = rate(v.yield), t = cleanNumber(v.maturity), after = cleanNumber(v.after), f = Math.max(1, cleanNumber(v.frequency));
      const now = bondPrice(face, c, y, t, f), later = bondPrice(face, c, y, Math.max(0.01, t - after), f);
      return [result("Bugünkü teorik fiyat", money(now)), result("Geçen süre sonrası fiyat", money(later)), result("Yakınsama etkisi", money(later - now))];
    },
  },
  {
    id: "effective-duration-convexity",
    title: "Efektif Durasyon ve Efektif Konveksite",
    category: "Duyarlılık",
    description: "Model fiyatlarından yukarı/aşağı faiz şoku ile efektif durasyon ve efektif konveksiteyi hesaplar.",
    formula: ["D_eff = (P_- - P_+) / (2 x P0 x Δy)", "C_eff = (P_- + P_+ - 2P0) / (P0 x Δy²)"],
    variables: variables("P_-:Faiz düştüğünde model fiyatı|P_+:Faiz yükseldiğinde model fiyatı|P0:Başlangıç model fiyatı|Δy:Faiz şoku büyüklüğü"),
    inputs: [input("priceDown", "Faiz düşüş fiyatı P-", "98500", "TL"), input("price0", "Başlangıç fiyatı P0", "95000", "TL"), input("priceUp", "Faiz yükseliş fiyatı P+", "91800", "TL"), input("shock", "Faiz şoku", "1", "%")],
    insight: "Efektif ölçüler, opsiyonlu tahviller veya gömülü opsiyon içeren ürünlerde daha anlamlıdır.",
    calc: (v) => {
      const pDown = cleanNumber(v.priceDown), p0 = cleanNumber(v.price0), pUp = cleanNumber(v.priceUp), dy = rate(v.shock);
      const d = dy === 0 || p0 === 0 ? 0 : (pDown - pUp) / (2 * p0 * dy);
      const c = dy === 0 || p0 === 0 ? 0 : (pDown + pUp - 2 * p0) / (p0 * dy * dy);
      return [result("Efektif durasyon", fmtNumber(d, 4)), result("Efektif konveksite", fmtNumber(c, 4))];
    },
  },
  {
    id: "interest-price",
    title: "Faiz & Fiyat",
    category: "Duyarlılık",
    description: "Faiz değişimi ve durasyon üzerinden sabit getirili enstrümanın yaklaşık fiyat değişimini verir.",
    formula: ["P_yeni ≈ P x (1 - D_Mod x Δy)"],
    variables: variables("P:Başlangıç fiyatı|D_Mod:Modifiye durasyon|Δy:Faiz oranı değişimi|P_yeni:Yaklaşık yeni fiyat"),
    inputs: [input("price", "Başlangıç fiyatı", "100000", "TL"), input("duration", "Modifiye durasyon", "3.1"), input("shock", "Faiz değişimi", "1", "%")],
    insight: "Faiz ve fiyat ters yönlüdür; durasyon bu ters ilişkinin yaklaşık eğimini gösterir.",
    calc: (v) => {
      const p = cleanNumber(v.price), impact = -cleanNumber(v.duration) * rate(v.shock);
      return [result("Fiyat değişimi", money(p * impact)), result("Yeni fiyat", money(p * (1 + impact))), result("Yüzde etki", pct(impact))];
    },
  },
  {
    id: "parametric-var-position",
    title: "Parametrik VaR-Pozisyon",
    category: "VaR ve Simülasyon",
    description: "Tek pozisyon için volatilite, güven düzeyi ve elde tutma süresiyle parametrik VaR hesaplar.",
    formula: ["VaR = V x z_α x σ x √h"],
    variables: variables("V:Pozisyon piyasa değeri|z_α:Güven düzeyi normal dağılım katsayısı|σ:Günlük volatilite|h:Elde tutma süresi"),
    inputs: [input("value", "Pozisyon değeri", "10000000", "TL"), input("vol", "Günlük volatilite", "1.8", "%"), input("z", "z katsayısı", "2.33"), input("horizon", "Elde tutma", "10", "gün")],
    insight: "Normal dağılım varsayımı hızlıdır; kuyruk riski yüksek portföylerde tarihsel veya stres yöntemleriyle desteklenmelidir.",
    calc: (v) => [result("Parametrik VaR", money(cleanNumber(v.value) * cleanNumber(v.z) * rate(v.vol) * Math.sqrt(cleanNumber(v.horizon))))],
  },
  {
    id: "parametric-var-portfolio",
    title: "Parametrik VaR-Portföy",
    category: "VaR ve Simülasyon",
    description: "İki ana risk faktörlü portföyde volatilite ve korelasyonla parametrik VaR hesaplar.",
    formula: ["σ_p = √[(V1σ1)² + (V2σ2)² + 2ρV1σ1V2σ2]", "VaR = z_α x σ_p x √h"],
    variables: variables("V1, V2:Risk faktörü bazında pozisyon değerleri|σ1, σ2:Risk faktörü günlük volatilitesi|ρ:İki risk faktörü korelasyonu|z_α:Güven düzeyi katsayısı"),
    inputs: [input("v1", "Pozisyon 1", "7000000", "TL"), input("vol1", "Volatilite 1", "1.4", "%"), input("v2", "Pozisyon 2", "5000000", "TL"), input("vol2", "Volatilite 2", "2.1", "%"), input("rho", "Korelasyon", "0.35"), input("z", "z katsayısı", "2.33"), input("horizon", "Elde tutma", "10", "gün")],
    insight: "Korelasyon düştükçe çeşitlendirme etkisi artar ve portföy VaR'ı tekil risklerin toplamından düşük olabilir.",
    calc: (v) => {
      const v1 = cleanNumber(v.v1), v2 = cleanNumber(v.v2), s1 = rate(v.vol1), s2 = rate(v.vol2), rho = cleanNumber(v.rho), z = cleanNumber(v.z), h = cleanNumber(v.horizon);
      const sigma = Math.sqrt((v1 * s1) ** 2 + (v2 * s2) ** 2 + 2 * rho * v1 * s1 * v2 * s2);
      return [result("Portföy günlük sigma", money(sigma)), result("Portföy VaR", money(z * sigma * Math.sqrt(h)))];
    },
  },
  {
    id: "historical-simulation",
    title: "Tarihsel Benzetim",
    category: "VaR ve Simülasyon",
    description: "Geçmiş getiri senaryolarını portföy değerine uygulayarak dağılım bazlı tarihsel VaR hesaplar.",
    formula: ["Kayıp_i = -V x r_i", "VaR_α = kayıp dağılımının α kantili"],
    variables: variables("V:Portföy değeri|r_i:i tarihsel senaryosundaki getiri|α:Güven düzeyi|VaR_α:Seçilen kantildeki kayıp"),
    inputs: [input("portfolio", "Portföy değeri", "10000000", "TL"), input("returns", "Tarihsel getiriler", "-0.8; 0.4; -1.2; 0.6; -2.1; 1.0; -0.3; -1.6; 0.2; -0.9", "", "text", "Her getiriyi yüzde değer olarak ayrı kutuya yaz."), input("confidence", "Güven düzeyi", "99", "%")],
    insight: "Tarihsel benzetim dağılım varsayımı gerektirmez; veri penceresi seçimi sonucu ciddi şekilde etkiler.",
    calc: (v) => {
      const portfolio = cleanNumber(v.portfolio), returns = list(v.returns), confidence = Math.min(0.999, Math.max(0.5, rate(v.confidence)));
      const losses = returns.map((item) => -portfolio * (item / 100)).sort((a, b) => a - b);
      const index = Math.min(losses.length - 1, Math.max(0, Math.ceil(confidence * losses.length) - 1));
      return [result("Tarihsel VaR", money(Math.max(0, losses[index] || 0))), result("En kötü senaryo", money(Math.max(...losses, 0))), result("Senaryo sayısı", fmtNumber(returns.length, 0))];
    },
  },
  {
    id: "macro-hedge",
    title: "Makro Hedge",
    category: "Türev ve Hedge",
    description: "Bu modüldeki gibi aktif/pasif tutarları, durasyonları ve faiz şoku üzerinden durasyon gap etkisini hesaplar.",
    formula: ["Durasyon GAP = D_A - D_L x (L / A)", "Asset Etki = -A x D_A x Δr", "Liability Etki = -L x D_L x Δr", "Toplam = Asset Etki - Liability Etki"],
    variables: variables("A:Asset tutarı|L:Liability tutarı|D_A:Asset durasyonu|D_L:Liability durasyonu|Δr:Faiz şoku"),
    inputs: [input("asset", "Asset Tutar", "1000"), input("liability", "Liability Tutar", "900"), input("assetDuration", "Asset Durasyon", "3"), input("liabilityDuration", "Liability Durasyon", "0.5"), input("equity", "Özkaynak", "100"), input("shock", "Şok", "1", "%")],
    insight: "Makro hedge burada hedge adedi değil, kaynak modeldeki gibi bilanço düzeyinde durasyon uyumsuzluğu ve faiz şoku etkisini gösterir.",
    calc: (v) => {
      const asset = cleanNumber(v.asset), liability = cleanNumber(v.liability), assetDuration = cleanNumber(v.assetDuration), liabilityDuration = cleanNumber(v.liabilityDuration), equity = cleanNumber(v.equity), shock = rate(v.shock);
      const gap = asset === 0 ? 0 : assetDuration - liabilityDuration * (liability / asset);
      const assetImpact = -asset * assetDuration * shock;
      const liabilityImpact = -liability * liabilityDuration * shock;
      const total = assetImpact - liabilityImpact;
      return [
        result("Durasyon GAP", fmtNumber(gap, 4)),
        result("Asset Etki", money(assetImpact)),
        result("Liability Etki", money(liabilityImpact)),
        result("Şok Sonrası Erime", pct(equity === 0 ? 0 : total / equity)),
      ];
    },
  },
  {
    id: "bootstrap",
    title: "Bootstrap",
    category: "Bono ve Getiri Eğrisi",
    description: "Kısa vade spot faiz ve kuponlu tahvil fiyatından daha uzun vade sıfır faiz oranını çözer.",
    formula: ["DF_1 = 1 / (1 + z1)", "DF_2 = (P - C x DF_1) / (F + C)", "z2 = (1 / DF_2)^(1/2) - 1"],
    variables: variables("DF:İskonto faktörü|z1, z2:Sıfır faiz oranları|P:Kuponlu tahvil fiyatı|C:Yıllık kupon tutarı"),
    inputs: [input("face", "Nominal", "100000", "TL"), input("coupon", "Kupon oranı", "30", "%"), input("price", "2Y tahvil fiyatı", "96000", "TL"), input("zero1", "1Y sıfır faiz", "32", "%")],
    insight: "Bootstrap, getiri eğrisini doğrudan piyasa fiyatlarından adım adım üretmek için kullanılır.",
    calc: (v) => {
      const face = cleanNumber(v.face), coupon = face * rate(v.coupon), priceValue = cleanNumber(v.price), z1 = rate(v.zero1);
      const df1 = 1 / (1 + z1), df2 = (priceValue - coupon * df1) / (face + coupon), z2 = df2 <= 0 ? 0 : pow(1 / df2, 1 / 2) - 1;
      return [result("1Y iskonto faktörü", fmtNumber(df1, 6)), result("2Y iskonto faktörü", fmtNumber(df2, 6)), result("2Y bootstrap sıfır faiz", pct(z2))];
    },
  },
  {
    id: "echols-elliott",
    title: "Echols-Elliot Modeli",
    category: "Bono ve Getiri Eğrisi",
    description: "Getiri eğrisini parametrik katsayılarla tahmin eden term structure yaklaşımını operasyonel hesaplayıcıya dönüştürür.",
    formula: ["ln(1 + r(T)) = b0 + b1T + b2T² + b3T³", "r(T) = e^[b0 + b1T + b2T² + b3T³] - 1"],
    variables: variables("r(T):T vadesi için tahmin edilen sıfır faiz|T:Yıl cinsinden vade|b0...b3:Kalibre edilmiş getiri eğrisi katsayıları|ln:Doğal logaritma dönüşümü"),
    inputs: [input("b0", "b0", "0.25"), input("b1", "b1", "-0.018"), input("b2", "b2", "0.0025"), input("b3", "b3", "-0.00012"), input("maturity", "Vade", "3", "yıl")],
    insight: "Bu modülde katsayılar kurumun kendi kalibrasyonundan gelmelidir; sonuç eğri üretim mantığını hızlıca görünür yapar.",
    calc: (v) => {
      const b0 = cleanNumber(v.b0), b1 = cleanNumber(v.b1), b2 = cleanNumber(v.b2), b3 = cleanNumber(v.b3), t = cleanNumber(v.maturity);
      const logYield = b0 + b1 * t + b2 * t * t + b3 * t * t * t;
      return [result("ln(1+r)", fmtNumber(logYield, 6)), result("Tahmini sıfır faiz", pct(Math.exp(logYield) - 1))];
    },
  },
  {
    id: "black-scholes",
    title: "Black Scholes",
    category: "Türev ve Hedge",
    description: "Avrupa tipi call ve put opsiyonların teorik değerini Black-Scholes-Merton formülüyle hesaplar.",
    formula: ["Call = S e^(-qT) N(d1) - K e^(-rT) N(d2)", "Put = K e^(-rT) N(-d2) - S e^(-qT) N(-d1)"],
    variables: variables("S:Dayanak varlık spot fiyatı|K:Kullanım fiyatı|r:Risksiz faiz oranı|σ:Yıllık volatilite"),
    inputs: [input("spot", "Spot fiyat", "100"), input("strike", "Strike", "105"), input("rate", "Risksiz faiz", "35", "%"), input("dividend", "Temettü/getiri", "0", "%"), input("vol", "Volatilite", "28", "%"), input("time", "Vade", "0.5", "yıl")],
    insight: "Black-Scholes kapalı form fiyat verir; volatilite ve vade opsiyon değerinin en kritik sürücüleridir.",
    calc: (v) => {
      const s = cleanNumber(v.spot), k = cleanNumber(v.strike), r = rate(v.rate), q = rate(v.dividend), sigma = rate(v.vol), t = cleanNumber(v.time);
      const denom = sigma * Math.sqrt(Math.max(t, 0.0001));
      const d1 = denom === 0 ? 0 : (Math.log(s / k) + (r - q + 0.5 * sigma * sigma) * t) / denom, d2 = d1 - denom;
      const call = s * Math.exp(-q * t) * normCdf(d1) - k * Math.exp(-r * t) * normCdf(d2);
      const put = k * Math.exp(-r * t) * normCdf(-d2) - s * Math.exp(-q * t) * normCdf(-d1);
      return [result("Call değeri", money(call)), result("Put değeri", money(put)), result("d1 / d2", `${fmtNumber(d1, 4)} / ${fmtNumber(d2, 4)}`)];
    },
  },
];

const sum = (items) => items.reduce((total, item) => total + item, 0);
const average = (items) => (items.length ? sum(items) / items.length : 0);
const smartRate = (value) => {
  const parsed = cleanNumber(value);
  return Math.abs(parsed) > 1 ? parsed / 100 : parsed;
};
const smartRateList = (value) => list(value).map((item) => (Math.abs(item) > 1 ? item / 100 : item));
const roundUp2 = (value) => Math.ceil(value * 100) / 100;
const fmtMaybeMoney = (value) => (Math.abs(value) >= 1000 ? money(value) : fmtNumber(value, 6));
const table = (title, note, columns, rows) => ({ title, note, columns, rows });

const variance = (items) => {
  if (items.length < 2) return 0;
  const mean = average(items);
  return sum(items.map((item) => (item - mean) ** 2)) / (items.length - 1);
};

const stdDev = (items) => Math.sqrt(variance(items));

const covariance = (left, right) => {
  const length = Math.min(left.length, right.length);
  if (length < 2) return 0;
  const l = left.slice(0, length);
  const r = right.slice(0, length);
  const lm = average(l);
  const rm = average(r);
  return sum(l.map((item, index) => (item - lm) * (r[index] - rm))) / (length - 1);
};

const percentileInc = (items, percentile) => {
  const sorted = [...items].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const p = Math.min(1, Math.max(0, percentile));
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
};

const isoDate = (date) => date.toISOString().slice(0, 10);
const dateUtc = (year, month, day) => new Date(Date.UTC(year, month - 1, day));
const addMonths = (date, months) => dateUtc(date.getUTCFullYear(), date.getUTCMonth() + months + 1, date.getUTCDate());
const daysBetween = (future, start) => Math.round((future.getTime() - start.getTime()) / 86400000);

const loanCurve = {
  days: [90, 180, 360, 720, 1080, 1440, 1800, 2520, 2880, 3240, 3600],
  rates: [0.094124, 0.094524, 0.095739, 0.097314, 0.098224, 0.098781, 0.098911, 0.099571, 0.100181, 0.100921, 0.101821],
};

const couponBondCurve = {
  days: [90, 180, 365, 730, 1095, 1460, 1825, 2190, 3285, 3650],
  rates: [0.0836, 0.0844, 0.0886, 0.0878, 0.0897, 0.085, 0.0881, 0.0867, 0.0884, 0.09],
};

const interpolationCurve = {
  days: [1, 5, 15, 30, 45, 60, 90, 100, 120, 140, 150, 180, 200, 210, 240, 270, 290, 300, 310, 340, 365],
  yields: [1, 2.5, 3.2, 4, 4, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5],
};

const bondMetrics = (face, couponRate, yieldRate, maturity, frequency) => {
  const periods = Math.max(1, Math.round(maturity * frequency));
  const discount = 1 + yieldRate / frequency;
  const coupon = (face * couponRate) / frequency;
  const rows = Array.from({ length: periods }, (_, index) => {
    const period = index + 1;
    const cashFlow = period === periods ? coupon + face : coupon;
    const pv = cashFlow / pow(discount, period);
    const weighted = pv * period;
    const convexRaw = weighted * (period + 1);
    return { period, cashFlow, pv, weighted, convexRaw };
  });
  const price = sum(rows.map((row) => row.pv));
  const weighted = sum(rows.map((row) => row.weighted));
  const convexRaw = sum(rows.map((row) => row.convexRaw));
  const macaulayValue = price === 0 ? 0 : weighted / (frequency * price);
  const modified = macaulayValue / (1 + yieldRate / frequency);
  const convex = price === 0 ? 0 : convexRaw / (frequency ** 2 * (1 + yieldRate / frequency) ** 2 * price);
  return { rows, price, weighted, convexRaw, macaulay: macaulayValue, modified, convex };
};

const levelLoanSchedule = (values) => {
  const loan = cleanNumber(values.loan);
  const annual = smartRate(values.annualRate);
  const months = Math.min(360, Math.max(1, Math.round(cleanNumber(values.months))));
  const basis = Math.max(1, cleanNumber(values.dayCount));
  const monthlyRate = annual / 12;
  const installment = monthlyRate === 0 ? loan / months : pmt(monthlyRate, months, loan);
  const portfolioDate = dateUtc(2013, 8, 28);
  const firstDate = dateUtc(2013, 9, 15);
  let balance = loan;
  return Array.from({ length: months }, (_, index) => {
    const date = addMonths(firstDate, index);
    const days = daysBetween(date, portfolioDate);
    const year = days / basis;
    const interest = balance * annual / 12;
    const principal = installment - interest;
    balance = Math.max(0, balance - principal);
    const curveRate = linearInterpolate(days, loanCurve.days, loanCurve.rates);
    const df = 1 / pow(1 + curveRate, year);
    const pv = installment * df;
    return {
      period: index + 1,
      date: isoDate(date),
      days,
      year,
      nominal: installment,
      principal,
      interest,
      balance,
      curveRate,
      df,
      pv,
    };
  });
};

const rateForward = (shortRate, shortTime, longRate, longTime, delta) =>
  delta === 0 ? 0 : pow(pow(1 + longRate, longTime) / pow(1 + shortRate, shortTime), 1 / delta) - 1;

const frnRows = ({ nominal, coupon, spread, days, ym, ynm, zero, period, finalNominal, discountSpread = 0 }) =>
  days.map((day, index) => {
    const m = day / 360;
    const n = period;
    const longTime = m + n;
    const forward = rateForward(ym[index], m, ynm[index], longTime, n);
    const interest = nominal * ((index === 0 ? coupon : forward) + spread) * period;
    const redemption = index === days.length - 1 ? finalNominal : 0;
    const df = 1 / pow(1 + zero[index] + discountSpread, m);
    const pv = (interest + redemption) * df;
    return { period: index + 1, day, m, n, longTime, ym: ym[index], ynm: ynm[index], forward, interest, redemption, zero: zero[index], df, pv };
  });

const getFRNCurves = (days) => {
  const ymCurve = {
    days: [50, 141, 232, 323, 414],
    rates: [0.0772866667, 0.081566, 0.0827793333, 0.0838754444, 0.084889]
  };
  const ynmCurve = {
    days: [50, 141, 232, 323, 414],
    rates: [0.08155, 0.082768, 0.0838628889, 0.0848788333, 0.085804]
  };
  const zeroCurve = {
    days: [50, 141, 232, 323, 414],
    rates: [0.0859333333, 0.08563, 0.0865111111, 0.0882805556, 0.089075]
  };

  const ym = days.map(d => linearInterpolate(d, ymCurve.days, ymCurve.rates));
  const ynm = days.map(d => linearInterpolate(d, ynmCurve.days, ynmCurve.rates));
  const zero = days.map(d => linearInterpolate(d, zeroCurve.days, zeroCurve.rates));

  return { ym, ynm, zero };
};

const getCorpFRNCurves = (days) => {
  const ymCurve = {
    days: [12, 43, 74, 105, 136, 167, 198, 229, 260, 291, 322, 353, 384, 415],
    rates: [0.0538533333, 0.0596744444, 0.0654955556, 0.0713166667, 0.0771377778, 0.0829588889, 0.08521, 0.0848827778, 0.0845555556, 0.0842283333, 0.0839011111, 0.0835738889, 0.0836666667, 0.0838819444]
  };
  const ynmCurve = {
    days: [12, 43, 74, 105, 136, 167, 198, 229, 260, 291, 322, 353, 384, 415],
    rates: [0.0859266667, 0.0857372222, 0.0855477778, 0.0853583333, 0.0851688889, 0.0849794444, 0.08479, 0.0846005556, 0.0844111111, 0.0842216667, 0.0840322222, 0.0838427778, 0.0841266667, 0.0845486111]
  };

  const ym = days.map(d => linearInterpolate(d, ymCurve.days, ymCurve.rates));
  const ynm = days.map(d => linearInterpolate(d, ynmCurve.days, ynmCurve.rates));
  const zero = days.map((day) => linearInterpolate(day / 360, [0, 1, 2], [0.08441, 0.08509, 0.08519]));

  return { ym, ynm, zero };
};

const getCovarianceMatrix = (matrix, n) => {
  const result = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) {
      if (i < matrix.length && j < matrix[i].length) {
        row.push(matrix[i][j]);
      } else if (i === j) {
        row.push(matrix[matrix.length - 1][matrix.length - 1]);
      } else {
        const varI = i < matrix.length ? matrix[i][i] : matrix[matrix.length - 1][matrix.length - 1];
        const varJ = j < matrix.length ? matrix[j][j] : matrix[matrix.length - 1][matrix.length - 1];
        row.push(0.95 * Math.sqrt(varI * varJ));
      }
    }
    result.push(row);
  }
  return result;
};

const fixedSwapRows = (notional, fixedRate, fixedDays, floatingDays, floatingRates) => {
  const days = list(fixedDays);
  const floatDaysList = list(floatingDays);
  const floatRatesList = smartRateList(floatingRates);

  return days.map((day, index) => {
    const year = day / 360;
    const isFirst = index === 0;
    const isLast = index === days.length - 1;
    const rateVal = linearInterpolate(day, floatDaysList, floatRatesList);
    
    let label = "Kupon";
    let payment = 0;
    let tau = 0;
    let simple = false;

    if (isFirst) {
      label = "Nominal";
      payment = -notional;
      tau = 0;
      simple = true;
    } else {
      tau = (day - days[index - 1]) / 360;
      payment = notional * fixedRate * tau;
      if (isLast) {
        label = "Efektif";
        payment += notional;
      }
    }

    const df = simple ? 1 / (1 + day * rateVal / 360) : 1 / pow(1 + rateVal, year);
    return {
      label,
      days: day,
      year,
      tau,
      rate: rateVal,
      payment,
      simple,
      df,
      pv: payment * df
    };
  });
};

const floatingSwapRows = (notional, floatingDays, floatingRates) => {
  const days = list(floatingDays);
  const rates = smartRateList(floatingRates);
  const years = days.map((day) => day / 360);
  const dfs = days.map((day, index) => (day <= 365 ? 1 / (1 + day * rates[index] / 360) : 1 / pow(1 + rates[index], years[index])));
  return days.map((day, index) => {
    const tau = index === 0 ? 0 : years[index] - years[index - 1];
    const forward = index === 0 ? 0 : (1 - dfs[index] / dfs[index - 1]) / ((dfs[index] / dfs[index - 1]) * tau);
    const payment = index === 0 ? -notional : notional * forward * tau + (index === days.length - 1 ? notional : 0);
    return { period: index + 1, day, year: years[index], tau, rate: rates[index], df: dfs[index], forward, payment, pv: payment * dfs[index] };
  });
};

const bsPrice = (spot, strike, riskFree, time, vol, type = "Put", dividend = 0) => {
  const safeTime = Math.max(time, 0.000001);
  const denom = vol * Math.sqrt(safeTime);
  const d1 = denom === 0 ? 0 : (Math.log(spot / strike) + (riskFree - dividend + 0.5 * vol * vol) * safeTime) / denom;
  const d2 = d1 - denom;
  const call = spot * Math.exp(-dividend * safeTime) * normCdf(d1) - strike * Math.exp(-riskFree * safeTime) * normCdf(d2);
  const put = strike * Math.exp(-riskFree * safeTime) * normCdf(-d2) - spot * Math.exp(-dividend * safeTime) * normCdf(-d1);
  return { call, put, d1, d2, price: String(type).toLocaleLowerCase("tr-TR").includes("call") ? call : put };
};

const moduleOverrides = {};

Object.assign(moduleOverrides, {
  "simple-compound-interest": {
    title: "Basit Faiz & Bileşik Faiz",
    description: "Bu modüldeki nominal, T ve r girişleriyle basit ve bileşik FV hesaplar.",
    formula: ["Basit FV = Nominal x (1 + T x r)", "Bileşik FV = Nominal x (1 + r)^T", "Karşılaştırma tablosu = 100 x (1 + T x r) ve 100 x (1 + r)^T"],
    variables: variables("Nominal:Başlangıç tutarı|T:Vade veya periyot sayısı|r:Dönemsel faiz oranı|FV:Vade sonu değer"),
    inputs: [
      input("principal", "Nominal", "10000000", "TL"),
      input("time", "T", "5"),
      input("rate", "r", "8.7", "%"),
      input("compareRates", "Karşılaştırma faizleri", "5; 10; 17", "%", "text", "", 3),
    ],
    calc: (v) => {
      const principal = cleanNumber(v.principal);
      const t = cleanNumber(v.time);
      const r = rate(v.rate);
      const simple = principal * (1 + t * r);
      const compound = principal * pow(1 + r, t);
      return [result("Basit Faiz FV", money(simple)), result("Bileşik Faiz FV", money(compound)), result("Fark", money(compound - simple))];
    },
    detail: (v) => {
      const principal = cleanNumber(v.principal) || 100;
      const periods = Math.max(1, Math.min(100, Math.round(cleanNumber(v.time) || 5)));
      const rates = smartRateList(v.compareRates);
      
      if (rates.length === 0) rates.push(0.05);

      const columns = ["Periyot"];
      rates.forEach((rateVal) => {
        columns.push(`${plainPct(rateVal, 2)}% Basit`);
        columns.push(`${plainPct(rateVal, 2)}% Bileşik`);
      });

      const rows = Array.from({ length: periods }, (_, index) => {
        const p = index + 1;
        const row = [p];
        rates.forEach((rateVal) => {
          row.push(money(principal * (1 + p * rateVal)));
          row.push(money(principal * pow(1 + rateVal, p)));
        });
        return row;
      });

      return table("Karşılaştırma tablosu", `Nominal değer: ${money(principal)}`, columns, rows);
    },
  },
  "compounding-frequency": {
    description: "Bu modüldeki yıllık, 6 aylık, 3 aylık ve sürekli yenileme sonuçlarını üretir.",
    formula: ["FV_m = Nominal x (1 + r / m)^(m x T)", "FV_sürekli = Nominal x e^(r x T)"],
    variables: variables("Nominal:Başlangıç tutarı|T:Yıl cinsinden süre|r:Nominal yıllık faiz|m:Yıllık yenileme frekansı"),
    inputs: [
      input("principal", "Nominal", "1000000", "TL"),
      input("time", "T", "6", "yıl"),
      input("rate", "r", "6.4", "%"),
      input("frequency", "Seçili frekans", "12", "kez/yıl"),
    ],
    calc: (v) => {
      const principal = cleanNumber(v.principal);
      const t = cleanNumber(v.time);
      const r = rate(v.rate);
      const selected = Math.max(1, cleanNumber(v.frequency));
      return [
        result("Yıllık FV", money(principal * pow(1 + r, t))),
        result("6 Aylık FV", money(principal * pow(1 + r / 2, 2 * t))),
        result("3 Aylık FV", money(principal * pow(1 + r / 4, 4 * t))),
        result("Sürekli FV", money(principal * Math.exp(r * t))),
        result("Seçili frekans FV", money(principal * pow(1 + r / selected, selected * t))),
      ];
    },
    detail: (v) => {
      const principal = cleanNumber(v.principal);
      const t = cleanNumber(v.time);
      const r = rate(v.rate);
      const selected = Math.max(1, cleanNumber(v.frequency));
      const frequencies = [...Array.from({ length: 24 }, (_, index) => index + 1), 36, 52, 72];
      if (!frequencies.includes(selected)) {
        frequencies.push(selected);
        frequencies.sort((a, b) => a - b);
      }
      const rows = frequencies.map((m) => {
        const isSelected = m === selected;
        const label = isSelected ? `${m} (Seçili)` : m;
        return [label, money(principal * pow(1 + r / m, m * t)), money(principal * Math.exp(r * t))];
      });
      return table("Yenileme frekansı", "Sürekli faiz limitiyle karşılaştırma", ["Yenileme Frekansı", "FV (Bileşik Değer)", "FV Sürekli (Sürekli Bileşik Değer)"], rows);
    },
  },
  "present-value": {
    formula: ["PV = FV / (1 + r)^T"],
    variables: variables("PV:Bugünkü değer|FV:Gelecek değer|T:Yıl cinsinden süre|r:Yıllık iskonto oranı"),
    inputs: [input("future", "FV", "800000", "TL"), input("time", "T", "4", "yıl"), input("rate", "r", "7.8", "%")],
    calc: (v) => [result("PV", money(cleanNumber(v.future) / pow(1 + rate(v.rate), cleanNumber(v.time))))],
    detail: (v) => {
      const fv = cleanNumber(v.future);
      const r = rate(v.rate);
      const t = Math.max(1, Math.round(cleanNumber(v.time)));
      const rows = Array.from({ length: t }, (_, index) => {
        const period = index + 1;
        return [period, money(fv), pct(r), fmtNumber(pow(1 + r, period), 6), money(fv / pow(1 + r, period))];
      });
      return table("Bugünkü değer tablosu", "PV = FV / (1 + r)^T", ["T", "FV", "r", "Bileşik çarpan", "PV"], rows);
    },
  },
  "multi-cash-flow": {
    description: "Bu modüldeki gibi eşit c ödemesini her dönem iskonto eder ve toplam PV üretir.",
    formula: ["PV_t = c / (1 + r)^t", "Toplam PV = Σ PV_t"],
    variables: variables("c:Her dönem ödeme|T:Toplam dönem sayısı|r:Dönemsel iskonto oranı|PV_t:t dönemindeki bugünkü değer"),
    inputs: [input("cash", "c", "4000", "TL"), input("periods", "T", "3"), input("rate", "r", "10", "%")],
    calc: (v) => {
      const c = cleanNumber(v.cash);
      const periods = Math.max(1, Math.round(cleanNumber(v.periods)));
      const r = rate(v.rate);
      const pv = sum(Array.from({ length: periods }, (_, index) => c / pow(1 + r, index + 1)));
      return [result("Toplam PV", money(pv)), result("Dönem sayısı", fmtNumber(periods, 0))];
    },
    detail: (v) => {
      const c = cleanNumber(v.cash);
      const periods = Math.max(1, Math.min(120, Math.round(cleanNumber(v.periods))));
      const r = rate(v.rate);
      const rows = Array.from({ length: periods }, (_, index) => {
        const period = index + 1;
        return [period, money(c), fmtNumber(1 / pow(1 + r, period), 6), money(c / pow(1 + r, period))];
      });
      return table("Nakit akışı", "Eşit c ödemeleri", ["Periyot", "Ödeme", "DF", "PV"], rows);
    },
  },
  annuity: {
    description: "Bu modüldeki annuite kapalı formuyla eşit ödeme serisinin PV değerini hesaplar.",
    formula: ["PV = (c / r) x (1 - 1 / (1 + r)^T)"],
    variables: variables("c:Dönemsel ödeme|T:Dönem sayısı|r:Dönemsel iskonto oranı|PV:Annuite bugünkü değeri"),
    inputs: [input("payment", "c", "4000", "TL"), input("periods", "T", "3"), input("rate", "r", "10", "%")],
    calc: (v) => {
      const c = cleanNumber(v.payment);
      const t = cleanNumber(v.periods);
      const r = rate(v.rate);
      return [result("PV", money(r === 0 ? c * t : (c / r) * (1 - 1 / pow(1 + r, t))))];
    },
    detail: (v) => ({
      ...moduleOverrides["multi-cash-flow"].detail({ cash: v.payment, periods: v.periods, rate: v.rate }),
      title: "Annuite nakit akışı",
      note: "Kapalı form PV ile dönem PV toplamı aynı değeri verir",
    }),
  },
  perpetuity: {
    description: "Bu modüldeki sabit perpetuity formülüyle sonsuz ödeme serisinin PV değerini hesaplar.",
    formula: ["PV = c / r"],
    variables: variables("c:Sonsuz devam eden dönemsel ödeme|r:Dönemsel iskonto oranı|PV:Perpetuity bugünkü değeri"),
    inputs: [input("cash", "c", "4"), input("rate", "r", "8.33", "%")],
    calc: (v) => [result("PV", fmtMaybeMoney(cleanNumber(v.cash) / rate(v.rate)))],
    detail: (v) => {
      const c = cleanNumber(v.cash);
      const r = rate(v.rate);
      return table("Perpetuity", "Sabit sonsuz nakit akışı", ["Kalem", "Değer"], [["c", fmtNumber(c, 6)], ["r", pct(r)], ["PV = c / r", fmtNumber(r === 0 ? 0 : c / r, 6)]]);
    },
  },
  amortization: {
    description: "Bu modüldeki konut kredisi taksit formülüyle aylık ödeme c değerini hesaplar.",
    formula: ["c = (Kredi Tutarı x r Aylık) / (1 - 1 / (1 + r Aylık)^n)"],
    variables: variables("Ev Değeri:Teminat veya konut değeri|Kredi Tutarı:Finanse edilen anapara|r Aylık:Aylık faiz oranı|n:Toplam ay sayısı|c:Aylık eşit ödeme"),
    inputs: [
      input("homeValue", "Ev Değeri", "125000", "TL"),
      input("loan", "Kredi Tutarı", "100000", "TL"),
      input("monthlyRate", "r Aylık", "1", "%"),
      input("periods", "n", "360", "ay"),
    ],
    calc: (v) => {
      const loan = cleanNumber(v.loan);
      const r = rate(v.monthlyRate);
      const n = Math.max(1, cleanNumber(v.periods));
      const payment = r === 0 ? loan / n : (loan * r) / (1 - 1 / pow(1 + r, n));
      return [result("c", money(payment)), result("Kredi / Ev Değeri", pct(cleanNumber(v.homeValue) === 0 ? 0 : loan / cleanNumber(v.homeValue)))];
    },
    detail: (v) => {
      const loan = cleanNumber(v.loan);
      const r = rate(v.monthlyRate);
      const n = Math.max(1, Math.min(360, Math.round(cleanNumber(v.periods))));
      const payment = r === 0 ? loan / n : (loan * r) / (1 - 1 / pow(1 + r, n));
      let balance = loan;
      const rows = Array.from({ length: n }, (_, index) => {
        const interest = balance * r;
        const principal = payment - interest;
        balance = Math.max(0, balance - principal);
        return [index + 1, money(payment), money(interest), money(principal), money(balance)];
      });
      return table("Amortizasyon örneği", "Tüm aylar gösterilir", ["Ay", "c (Aylık ödeme)", "Faiz", "Anapara", "Kalan Bakiye"], rows);
    },
  },
  "level-payment-loan": {
    description: "Bu modüldeki PMT, anapara/faiz kırılımı, interpolasyonlu faiz ve iskonto faktörüyle eşit taksitli kredi fiyatlar.",
    formula: ["Nominal = PMT(Faiz Oranı / 12, Taksit Sayısı, -Bakiye)", "Faiz_t = Kalan Anapara_(t-1) x Faiz Oranı / 12", "Faiz eğrisi = LinearInterpolator(TRL.GOV, VKGS)", "PV_t = Nominal_t x DiscountFactor_t"],
    variables: variables("Bakiye:Başlangıç kredi bakiyesi|Faiz Oranı:Yıllık kredi faizi|Taksit Sayısı:Aylık ödeme sayısı|VKGS:Portföy tarihinden ödeme tarihine gün|DiscountFactor:1 / (1 + eğri faizi)^VKGS yıl"),
    inputs: [
      input("loan", "Bakiye", "200000", "TL"),
      input("annualRate", "Faiz Oranı", "13", "%"),
      input("months", "Taksit Sayısı", "85"),
      input("dayCount", "Day Count Basis", "360"),
    ],
    calc: (v) => {
      const rows = levelLoanSchedule(v);
      return [
        result("Nominal toplam", money(sum(rows.map((row) => row.nominal)))),
        result("Anapara toplam", money(sum(rows.map((row) => row.principal)))),
        result("Faiz toplam", money(sum(rows.map((row) => row.interest)))),
        result("PV toplam", money(sum(rows.map((row) => row.pv)))),
      ];
    },
    detail: (v) => {
      const rows = levelLoanSchedule(v).map((row) => [
        row.period,
        row.date,
        row.days,
        fmtNumber(row.year, 6),
        money(row.nominal),
        money(row.principal),
        money(row.interest),
        money(row.balance),
        pct(row.curveRate),
        fmtNumber(row.df, 6),
        money(row.pv),
      ]);
      return table("Kredi ödeme planı", "PMT + LinearInterpolator + DF", ["#", "Tarih", "VKGS", "VKGS Yıl", "Nominal", "Anapara", "Faiz", "Kalan Anapara", "Faiz", "DiscountFactor", "PV"], rows);
    },
  },
});

Object.assign(moduleOverrides, {
  "continuous-compounding": {
    detail: (v) => {
      const pv = cleanNumber(v.present);
      const fv = cleanNumber(v.future);
      const t = cleanNumber(v.days) / 360;
      const simple = t === 0 ? 0 : (fv / pv - 1) / t;
      const compound = t === 0 ? 0 : pow(fv / pv, 1 / t) - 1;
      const continuous = t === 0 || fv === 0 ? 0 : -Math.log(pv / fv) / t;
      return table("Faiz dönüşümü", "Basit, bileşik ve sürekli oranlar", ["Kalem", "Formül", "Sonuç"], [
        ["T", "gün / 360", fmtNumber(t, 8)],
        ["Basit", "(FV / PV - 1) / T", pct(simple)],
        ["Bileşik", "(FV / PV)^(1 / T) - 1", pct(compound)],
        ["Sürekli", "-LN(PV / FV) / T", pct(continuous)],
      ]);
    },
  },
  "zero-coupon-bond": {
    inputs: [
      input("face", "Nominal", "100", "TL"),
      input("days", "Vadeye Kalan Gün Sayısı", "364", "gün"),
      input("yield", "Beklenen Getiri", "8.65", "%"),
    ],
    calc: (v) => {
      const face = cleanNumber(v.face);
      const days = cleanNumber(v.days);
      const yieldRate = rate(v.yield);
      return [result("PV", money(face / (1 + days * (yieldRate / 365))))];
    },
    detail: (v) => {
      const face = cleanNumber(v.face);
      const days = cleanNumber(v.days);
      const yieldRate = rate(v.yield);
      const denominator = 1 + days * (yieldRate / 365);
      return table("Kuponsuz bono", "Para piyasası tipi gün sayılı iskonto", ["Kalem", "Değer"], [
        ["Nominal", money(face)],
        ["Vadeye Kalan Gün Sayısı", fmtNumber(days, 0)],
        ["Beklenen Getiri", pct(yieldRate)],
        ["1 + VKGS x r / 365", fmtNumber(denominator, 8)],
        ["PV", money(face / denominator)],
      ]);
    },
  },
  "cash-flow": {
    description: "Bu modüldeki kuponlu bono nakit akışı örneğini dönem, tutar, DF ve PV kolonlarıyla gösterir.",
    formula: ["Kupon = Anapara x Kupon Oranı / 2", "DF_t = 1 / (1 + Beklenen Getiri / 2)^t", "PV = Σ Tutar_t x DF_t"],
    variables: variables("Anapara:Vade sonunda geri ödenecek nominal|Kupon Oranı:Yıllık kupon oranı|Kupon:Yarı yıllık kupon tutarı|DF:İskonto faktörü|PV:Bugünkü değer"),
    inputs: [
      input("principal", "Anapara", "100"),
      input("couponRate", "Kupon Oranı", "12", "%"),
      input("maturity", "Vade", "2", "yıl"),
      input("yield", "Beklenen Getiri", "9", "%"),
    ],
    calc: (v) => {
      const principal = cleanNumber(v.principal);
      const coupon = principal * rate(v.couponRate) / 2;
      const periods = Math.max(1, Math.round(cleanNumber(v.maturity) * 2));
      const y = rate(v.yield);
      const pv = sum(Array.from({ length: periods }, (_, index) => {
        const period = index + 1;
        const amount = period === periods ? coupon + principal : coupon;
        return amount / pow(1 + y / 2, period);
      }));
      return [result("Kupon", money(coupon)), result("PV", money(pv)), result("Ödeme sayısı", fmtNumber(periods, 0))];
    },
    detail: (v) => {
      const principal = cleanNumber(v.principal);
      const coupon = principal * rate(v.couponRate) / 2;
      const periods = Math.max(1, Math.min(120, Math.round(cleanNumber(v.maturity) * 2)));
      const y = rate(v.yield);
      const rows = Array.from({ length: periods }, (_, index) => {
        const period = index + 1;
        const amount = period === periods ? coupon + principal : coupon;
        const df = 1 / pow(1 + y / 2, period);
        return [period, money(amount), fmtNumber(df, 6), money(amount * df)];
      });
      return table("Cash Flow", "Yarı yıllık kupon akışı", ["Dönem", "Tutar", "DF", "PV"], rows);
    },
  },
  "coupon-bond": {
    description: "Bu modüldeki kupon tarihleri, VKGS, verim eğrisi interpolasyonu, DF ve PV kolonlarıyla kuponlu bono fiyatlar.",
    formula: ["Dönemlik Kupon = Nominal x Kupon Oranı / 2", "Faiz Oranı = LinearInterpolator(Verim Eğrisi, VKGS)", "DF = 1 / (1 + Faiz Oranı)^(VKGS / DCB)", "Kirli Fiyat = Σ PV; Temiz Fiyat = Kirli Fiyat - TF"],
    variables: variables("VKGS:Vadeye kalan gün sayısı|DCB:Day count basis|TF:İşlemiş faiz düzeltmesi|DF:İskonto faktörü"),
    inputs: [
      input("face", "Nominal", "100", "TL"),
      input("coupon", "Kupon Oranı", "8.3", "%"),
      input("days", "VKGS listesi", "140; 322; 504; 686", "gün", "text"),
      input("dayCount", "DCB", "365"),
    ],
    calc: (v) => {
      const face = cleanNumber(v.face);
      const coupon = face * rate(v.coupon) / 2;
      const days = list(v.days);
      const dcb = cleanNumber(v.dayCount) || 365;
      const dirty = sum(days.map((day, index) => {
        const amount = index === days.length - 1 ? coupon + face : coupon;
        const curveRate = linearInterpolate(day, couponBondCurve.days, couponBondCurve.rates);
        return amount / pow(1 + curveRate, day / dcb);
      }));
      const accruedAdjustment = days[0] ? (1 - days[0] / 182) * coupon : 0;
      return [result("Kirli fiyat", money(dirty)), result("TF", money(accruedAdjustment)), result("Temiz fiyat", money(dirty - accruedAdjustment))];
    },
    detail: (v) => {
      const face = cleanNumber(v.face);
      const coupon = face * rate(v.coupon) / 2;
      const days = list(v.days);
      const dcb = cleanNumber(v.dayCount) || 365;
      const rows = days.map((day, index) => {
        const amount = index === days.length - 1 ? coupon + face : coupon;
        const curveRate = linearInterpolate(day, couponBondCurve.days, couponBondCurve.rates);
        const df = 1 / pow(1 + curveRate, day / dcb);
        return [index + 1, day, fmtNumber(day / dcb, 6), money(amount), pct(curveRate), fmtNumber(df, 6), money(amount * df)];
      });
      return table("Bono fiyatı", "Verim eğrisi LinearInterpolator ile okunur", ["Kupon Dönemi", "VKGS", "VKGS Yıl", "Tutar", "Faiz Oranı", "DF", "PV"], rows);
    },
  },
  "forward-rate": {
    inputs: [
      input("spot1", "Bir Yıllık Spot", "8.509", "%"),
      input("t1", "T1", "1", "yıl"),
      input("spot2", "İki Yıllık Spot", "8.577", "%"),
      input("t2", "T2", "2", "yıl"),
    ],
    detail: (v) => {
      const spotCurve = [0.08509, 0.08577, 0.08628, 0.08678, 0.08731, 0.087615, 0.08792, 0.08845, 0.08879, 0.08918];
      const rows = spotCurve.map((spot, index) => {
        const tenor = index + 1;
        const base = spotCurve[0];
        const forward = tenor === 1 ? base : pow(pow(1 + spot, tenor) / (1 + base), 1 / (tenor - 1)) - 1;
        return [tenor, pct(spot), pct(forward)];
      });
      const f11 = rateForward(rate(v.spot1), cleanNumber(v.t1), rate(v.spot2), cleanNumber(v.t2), cleanNumber(v.t2) - cleanNumber(v.t1));
      rows.unshift(["f1,1", `${pct(rate(v.spot1))} -> ${pct(rate(v.spot2))}`, pct(f11)]);
      return table("Forward curve", "TRL GOV spot verim eğrisi", ["Tenor", "Spot Verim Eğrisi", "Forward Verim Eğrisi"], rows);
    },
  },
  "forward-rate-contract": {
    inputs: [
      input("notional", "Nominal", "1000000", "TL"),
      input("fixed", "Sabit Ödeme", "8.5", "%"),
      input("r1", "LIBOR T1", "8.434", "%"),
      input("t1", "T1", "1", "yıl"),
      input("r2", "LIBOR T2", "8.8", "%"),
      input("t2", "T2", "2", "yıl"),
      input("discount", "r2 iskonto", "0", "%"),
    ],
    detail: (v) => {
      const t1 = cleanNumber(v.t1);
      const t2 = cleanNumber(v.t2);
      const r1 = rate(v.r1);
      const r2 = rate(v.r2);
      const forward = pow(1 + r2, t2) / pow(1 + r1, t1) - 1;
      const tau = t2 - t1;
      const p = cleanNumber(v.notional) * (forward - rate(v.fixed)) * tau * Math.exp(-rate(v.discount) * t2);
      return table("Forward rate sözleşmesi", "Sabit ve değişken ödeme farkı", ["Kalem", "Değer"], [
        ["Sabit Ödeme", pct(rate(v.fixed))],
        ["Değişken Ödeme", pct(forward)],
        ["τ", fmtNumber(tau, 6)],
        ["P", money(p)],
      ]);
    },
  },
  "floating-rate-note": {
    description: "Bu modüldeki değişken faizli bonoda forward m,n, spread, zero r, DF ve PV kolonlarını üretir.",
    formula: ["Forward m,n = (((1 + yn+m)^(n+m)) / ((1 + ym)^m))^(1/n) - 1", "Faiz = Nominal x ((Forward m,n + Spread) / 4)", "DF = 1 / (1 + zero r)^m", "PV = (Faiz + Nominal) x DF"],
    variables: variables("m:Değerleme tarihinden kupon tarihine yıl|n:Kupon dönemi uzunluğu|ym:m vadesindeki eğri faizi|yn+m:n+m vadesindeki eğri faizi|zero r:İskonto eğrisi oranı"),
    inputs: [
      input("face", "Nominal", "1000000", "TL"),
      input("coupon", "Kupon", "8.25", "%"),
      input("spread", "Spread", "1", "%"),
      input("days", "VKGS listesi", "50; 141; 232; 323; 414", "gün", "text"),
      input("period", "n", "0.25", "yıl"),
    ],
    calc: (v) => {
      const days = list(v.days);
      const { ym, ynm, zero } = getFRNCurves(days);
      const rows = frnRows({ nominal: cleanNumber(v.face), coupon: rate(v.coupon), spread: rate(v.spread), days, ym, ynm, zero, period: cleanNumber(v.period), finalNominal: cleanNumber(v.face) });
      const tf = cleanNumber(v.face) * ((rate(v.coupon) + rate(v.spread)) / 4) * (41 / 91);
      const pv = sum(rows.map((row) => row.pv));
      return [result("PV", money(pv)), result("TF", money(tf)), result("CP", money(pv - tf))];
    },
    detail: (v) => {
      const days = list(v.days);
      const { ym, ynm, zero } = getFRNCurves(days);
      const rows = frnRows({ nominal: cleanNumber(v.face), coupon: rate(v.coupon), spread: rate(v.spread), days, ym, ynm, zero, period: cleanNumber(v.period), finalNominal: cleanNumber(v.face) }).map((row) => [
        row.period,
        row.day,
        fmtNumber(row.m, 6),
        fmtNumber(row.n, 4),
        fmtNumber(row.longTime, 6),
        pct(row.ym),
        pct(row.ynm),
        pct(row.forward),
        money(row.interest),
        money(row.redemption),
        pct(row.zero),
        fmtNumber(row.df, 6),
        money(row.pv),
      ]);
      return table("Değişken faizli bono", "Forward m,n + spread ile kupon tahmini", ["#", "VKGS", "m (Kupon vadesi yıl)", "n (Kupon dönemi yıl)", "n+m (Toplam vade)", "ym (Kısa spot faiz)", "yn+m (Uzun spot faiz)", "Forward m,n (İma edilen faiz)", "Faiz", "Nominal", "zero r (İskonto faizi)", "DF (İskonto faktörü)", "PV (Bugünkü değer)"], rows);
    },
  },
  spread: {
    description: "Bu modüldeki Spread, G-Spread, I-Spread ve Z-Spread kavramlarını aynı terminolojiyle özetler.",
    formula: ["Spread = (Riskli Verim - ABD 10Y Gösterge) x 10000", "G-Spread = Riskli Verim - hazine interpolasyonu", "I-Spread = Riskli Verim - swap eğrisi interpolasyonu", "Z-Spread = fiyatı eşitleyen sabit iskonto spreadi"],
    inputs: [
      input("treasuryYield", "Hazine EBond Verim", "5.025413", "%"),
      input("corporateYield", "Arçelik EBond Verim", "6.459853", "%"),
      input("benchmarkYield", "ABD 10 Yıllık Gösterge", "2.71304", "%"),
      input("zSpread", "Z-Spread", "246.06229", "bp"),
    ],
    calc: (v) => {
      const benchmark = rate(v.benchmarkYield);
      const treasury = rate(v.treasuryYield);
      const corporate = rate(v.corporateYield);
      return [
        result("Hazine Spread", bp(treasury - benchmark)),
        result("Arçelik Spread", bp(corporate - benchmark)),
        result("Z-Spread", `${fmtNumber(cleanNumber(v.zSpread), 4)} bp`),
      ];
    },
    detail: (v) => table("Spread özeti", "US900123CA66 örneği", ["Enstrüman", "Verim", "Benchmark", "Spread"], [
      ["Hazine EBond", pct(rate(v.treasuryYield)), pct(rate(v.benchmarkYield)), bp(rate(v.treasuryYield) - rate(v.benchmarkYield))],
      ["Arçelik EBond", pct(rate(v.corporateYield)), pct(rate(v.benchmarkYield)), bp(rate(v.corporateYield) - rate(v.benchmarkYield))],
      ["Z-Spread", "-", "-", `${fmtNumber(cleanNumber(v.zSpread), 4)} bp`],
    ]),
  },
  "corporate-zero": {
    detail: (v) => {
      const face = cleanNumber(v.face);
      const cases = [
        ["1 Yıl", cleanNumber(v.days), rate(v.yieldA), rate(v.yieldBBB)],
        ["10 Yıl", 3652, 0.037478, 0.048745],
      ];
      const rows = cases.map(([label, days, yA, yBBB]) => {
        const priceA = face / (1 + days * (yA / 365));
        const priceBBB = face / (1 + days * (yBBB / 365));
        return [label, days, pct(yA), money(priceA), pct(yBBB), money(priceBBB), pct(priceA / priceBBB - 1)];
      });
      return table("Rating farkı", "Industrial A / Industrial BBB-", ["Vade", "VKGS", "A Verim", "A PV", "BBB- Verim", "BBB- PV", "Spread Etkisi"], rows);
    },
  },
  "corporate-floating": {
    description: "Bu modüldeki Değişken Faizli Şirket Bonosu modelinde 2Y IECM + spread, z discount margin ve aylık kupon akışıyla fiyat hesaplar.",
    formula: ["Forward m,n = (((1 + yn+m)^(n+m)) / ((1 + ym)^m))^(1/n) - 1", "DF = 1 / (1 + zero r + z)^m", "PV = Σ (Faiz + Nominal) x DF", "CP = PV - TF"],
    variables: variables("z:Discount Margin|m:Değerleme tarihinden kupon tarihine yıl|n:Referans vade|TF:Tahakkuk faizi|CP:Clean price"),
    inputs: [
      input("face", "Nominal", "100"),
      input("coupon", "Kupon", "8.48", "%"),
      input("spread", "Spread", "1.1", "%"),
      input("discountMargin", "Discount Margin (z)", "1.2155301486", "%"),
      input("period", "n", "2", "yıl"),
      input("days", "VKGS listesi", "12; 43; 74; 105; 136; 167; 198; 229; 260; 291; 322; 353; 384; 415", "gün", "text"),
    ],
    calc: (v) => {
      const days = list(v.days);
      const { ym, ynm, zero } = getCorpFRNCurves(days);
      const rows = frnRows({ nominal: cleanNumber(v.face), coupon: rate(v.coupon), spread: rate(v.spread), days, ym, ynm, zero, period: cleanNumber(v.period), finalNominal: cleanNumber(v.face), discountSpread: rate(v.discountMargin) });
      const pv = sum(rows.map((row) => row.pv));
      const tf = cleanNumber(v.face) * ((rate(v.coupon) + rate(v.spread)) / 12) * (19 / 31);
      return [result("PV", money(pv)), result("TF", money(tf)), result("CP", money(pv - tf))];
    },
    detail: (v) => {
      const days = list(v.days);
      const { ym, ynm, zero } = getCorpFRNCurves(days);
      const rows = frnRows({ nominal: cleanNumber(v.face), coupon: rate(v.coupon), spread: rate(v.spread), days, ym, ynm, zero, period: cleanNumber(v.period), finalNominal: cleanNumber(v.face), discountSpread: rate(v.discountMargin) }).map((row) => [
        row.period,
        row.day,
        fmtNumber(row.m, 6),
        fmtNumber(row.n, 4),
        pct(row.forward),
        money(row.interest),
        money(row.redemption),
        pct(row.zero + rate(v.discountMargin)),
        fmtNumber(row.df, 6),
        money(row.pv),
      ]);
      return table("Şirket FRN", "z discount margin dahil", ["#", "VKGS", "m (Kupon vadesi yıl)", "n (Kupon dönemi yıl)", "Forward m,n (İma edilen faiz)", "Faiz", "Nominal", "zero r + z (İskonto faizi)", "DF (İskonto faktörü)", "PV (Bugünkü değer)"], rows);
    },
  },
});

Object.assign(moduleOverrides, {
  swap: {
    description: "Bu modüldeki sabit ödeme alıcısı ve değişken ödeme bacaklarını ayrı ayrı iskonto eder.",
    formula: ["Fiyat = PV_Sabit Bacak - PV_Değişken Bacak", "Sabit ödeme = Nominal x Kupon x τ", "Forward Rate = (1 - DF_t / DF_t-1) / ((DF_t / DF_t-1) x τ)", "PV = Ödeme x İskonto Faktörü"],
    variables: variables("τ:İki ödeme tarihi arasındaki yıl fraksiyonu|DF:İskonto faktörü|Forward Rate:Değişken bacak kupon oranı|PV:Bacak nakit akışının bugünkü değeri"),
    inputs: [
      input("notional", "Nominal", "10000000", "TL"),
      input("fixed", "Kupon", "8.540364", "%"),
      input("floatingDays", "Değişken Bacak Günleri", "35; 125; 217; 309; 400; 490; 582; 674; 765", "gün", "text"),
      input("floatingRates", "Değişken Faiz Oranları", "7.403697; 7.788072; 7.88687; 7.914228; 7.990346; 8.148447; 8.302702; 8.449573; 8.516347", "%", "text"),
      input("fixedDays", "Sabit Bacak Günleri", "35; 400; 765", "gün", "text"),
    ],
    calc: (v) => {
      const notional = cleanNumber(v.notional);
      const fixed = fixedSwapRows(notional, rate(v.fixed), v.fixedDays, v.floatingDays, v.floatingRates);
      const floating = floatingSwapRows(notional, v.floatingDays, v.floatingRates);
      const fixedPv = sum(fixed.map((row) => row.pv));
      const floatingPv = sum(floating.map((row) => row.pv));
      return [result("Sabit bacak PV", money(fixedPv)), result("Değişken bacak PV", money(floatingPv)), result("Fiyat", money(fixedPv - floatingPv))];
    },
    detail: (v) => {
      const notional = cleanNumber(v.notional);
      const fixed = fixedSwapRows(notional, rate(v.fixed), v.fixedDays, v.floatingDays, v.floatingRates).map((row) => [
        "Sabit",
        row.label,
        row.days,
        fmtNumber(row.year, 6),
        fmtNumber(row.tau, 6),
        pct(row.rate),
        "",
        money(row.payment),
        fmtNumber(row.df, 6),
        money(row.pv),
      ]);
      const floating = floatingSwapRows(notional, v.floatingDays, v.floatingRates).map((row) => [
        "Değişken",
        row.period,
        row.day,
        fmtNumber(row.year, 6),
        fmtNumber(row.tau, 6),
        pct(row.rate),
        row.period === 1 ? "" : pct(row.forward),
        money(row.payment),
        fmtNumber(row.df, 6),
        money(row.pv),
      ]);
      return table("Swap bacakları", "Sabit ödeme alıcısı / değişken ödeme", ["Bacak", "#", "VKGS", "VKGS Yıl", "τ (Yıl fraksiyonu)", "Faiz Oranı", "Forward Rate", "Ödeme", "İskonto Faktörü", "PV (Bugünkü değer)"], [...fixed, ...floating]);
    },
  },
  "linear-interpolation": {
    inputs: [input("x", "Aranan gün", "190", "gün")],
    calc: (v) => {
      const x = cleanNumber(v.x);
      return [result("Lineer interpolasyon", `${fmtNumber(linearInterpolate(x, interpolationCurve.days, interpolationCurve.yields), 6)}%`)];
    },
    detail: (v) => {
      const x = cleanNumber(v.x);
      const index = Math.max(0, Math.min(interpolationCurve.days.length - 2, interpolationCurve.days.findIndex((day) => day >= x) - 1));
      const left = interpolationCurve.days[index] <= x ? index : Math.max(0, index - 1);
      const right = Math.min(interpolationCurve.days.length - 1, left + 1);
      const y = linearInterpolate(x, interpolationCurve.days, interpolationCurve.yields);
      return table("Lineer interpolasyon", "FORECAST/INDEX yaklaşımıyla aynı doğrusal oran", ["Nokta", "Gün", "Faiz"], [
        ["Alt nokta", interpolationCurve.days[left], `${fmtNumber(interpolationCurve.yields[left], 6)}%`],
        ["Aranan gün", x, `${fmtNumber(y, 6)}%`],
        ["Üst nokta", interpolationCurve.days[right], `${fmtNumber(interpolationCurve.yields[right], 6)}%`],
      ]);
    },
  },
  swaption: {
    inputs: [
      input("notional", "Nominal", "10000000", "TL"),
      input("annuity", "Swap annuite faktörü", "1.7831273176"),
      input("forward", "Forward Swap Rate", "8.5403636199", "%"),
      input("strike", "Swaption Oranı", "8.540364", "%"),
      input("vol", "Forward Rate σ", "25", "%"),
      input("time", "YTM", "0.0916666667", "yıl"),
    ],
    calc: (v) => {
      const n = cleanNumber(v.notional);
      const a = cleanNumber(v.annuity);
      const f = rate(v.forward);
      const k = rate(v.strike);
      const sigma = rate(v.vol);
      const t = cleanNumber(v.time);
      const denom = sigma * Math.sqrt(Math.max(t, 0.0001));
      const d1 = denom === 0 ? 0 : (Math.log(f / k) + sigma ** 2 * (t / 2)) / denom;
      const d2 = d1 - denom;
      const payer = n * a * (f * normCdf(d1) - k * normCdf(d2));
      const receiver = n * a * (k * normCdf(-d2) - f * normCdf(-d1));
      return [result("Payer hesaplaması", money(payer)), result("Receiver hesaplaması", money(receiver)), result("d1 / d2", `${fmtNumber(d1, 6)} / ${fmtNumber(d2, 6)}`)];
    },
    detail: (v) => {
      const n = cleanNumber(v.notional);
      const a = cleanNumber(v.annuity);
      const f = rate(v.forward);
      const k = rate(v.strike);
      const sigma = rate(v.vol);
      const t = cleanNumber(v.time);
      const denom = sigma * Math.sqrt(Math.max(t, 0.0001));
      const d1 = denom === 0 ? 0 : (Math.log(f / k) + sigma ** 2 * (t / 2)) / denom;
      const d2 = d1 - denom;
      const payerConstant = f * normCdf(d1) - k * normCdf(d2);
      const receiverConstant = k * normCdf(-d2) - f * normCdf(-d1);
      return table("Black-76 swaption", "Forward swap rate üzerinden payer/receiver", ["Kalem", "Değer"], [
        ["Forward Swap Rate", pct(f)],
        ["Swaption Rate", pct(k)],
        ["YTM", fmtNumber(t, 8)],
        ["d1", fmtNumber(d1, 8)],
        ["d2", fmtNumber(d2, 8)],
        ["Payer Constant", fmtNumber(payerConstant, 10)],
        ["Receiver Constant", fmtNumber(receiverConstant, 10)],
        ["Payer Hesaplaması", money(n * a * payerConstant)],
        ["Receiver Hesaplaması", money(n * a * receiverConstant)],
      ]);
    },
  },
  "macaulay-duration": {
    inputs: [input("face", "Nominal", "100"), input("coupon", "Kupon Oranı", "6", "%"), input("maturity", "Vade", "5", "yıl"), input("frequency", "Ödeme Sıklığı", "2"), input("yield", "İç Verim Oranı", "6", "%")],
    calc: (v) => {
      const metrics = bondMetrics(cleanNumber(v.face), rate(v.coupon), rate(v.yield), cleanNumber(v.maturity), cleanNumber(v.frequency));
      return [result("Macaulay D", `${fmtNumber(metrics.macaulay, 6)} yıl`), result("Fiyat", money(metrics.price))];
    },
    detail: (v) => {
      const metrics = bondMetrics(cleanNumber(v.face), rate(v.coupon), rate(v.yield), cleanNumber(v.maturity), cleanNumber(v.frequency));
      const rows = metrics.rows.map((row) => [row.period, money(row.cashFlow), money(row.pv), fmtNumber(row.weighted, 6)]);
      rows.push(["Toplam", "", money(metrics.price), fmtNumber(metrics.weighted, 6)]);
      return table("Macaulay Durasyonu", "PV x t ağırlıklı vade", ["Periyot", "Kupon", "PV", "PV x t"], rows);
    },
  },
  "modified-duration": {
    description: "Bu modüldeki bono fiyatı üzerinden Macaulay D, Modifiye D ve faiz artışı sonrası fiyat etkisini hesaplar.",
    formula: ["Macaulay D = Σ(PV x t) / (Ödeme Sıklığı x Fiyat)", "Modifiye D = Macaulay D / (1 + İç Verim Oranı / 2)", "Bono Fiyatındaki Değişim = -Modifiye D x Faiz Artış Oranı"],
    inputs: [input("face", "Nominal", "100"), input("coupon", "Kupon Oranı", "9.875", "%"), input("maturity", "Vade", "7", "yıl"), input("frequency", "Ödeme Sıklığı", "2"), input("yield", "İç Verim Oranı", "8.28", "%"), input("shock", "Faiz Artış Oranı", "1", "%")],
    calc: (v) => {
      const metrics = bondMetrics(cleanNumber(v.face), rate(v.coupon), rate(v.yield), cleanNumber(v.maturity), cleanNumber(v.frequency));
      const impact = -metrics.modified * rate(v.shock);
      return [result("Macaulay D", fmtNumber(metrics.macaulay, 6)), result("Modifiye D", fmtNumber(metrics.modified, 6)), result("Bono fiyatı", money(metrics.price)), result("Faiz artışı sonrası fiyat", money(metrics.price * (1 + impact)))];
    },
    detail: (v) => {
      const metrics = bondMetrics(cleanNumber(v.face), rate(v.coupon), rate(v.yield), cleanNumber(v.maturity), cleanNumber(v.frequency));
      return table("Durasyon ve fiyat", "Nakit akışı tablosu", ["Periyot", "Kupon", "PV", "PV x t"], metrics.rows.map((row) => [row.period, money(row.cashFlow), money(row.pv), fmtNumber(row.weighted, 6)]));
    },
  },
  "portfolio-duration": {
    inputs: [
      input("marketValues", "Piyasa Değeri", "23731; 20000; 14667; 5271", "TL", "text"),
      input("durations", "Modifiye Durasyon", "2.59; 3.86; 4.47; 5.32", "", "text"),
      input("shock", "Faiz Artış Oranı", "1", "%"),
    ],
    calc: (v) => {
      const values = list(v.marketValues);
      const durations = list(v.durations);
      const total = sum(values);
      const duration = sum(values.map((item, index) => (total === 0 ? 0 : (item / total) * (durations[index] || 0))));
      const impact = -duration * rate(v.shock);
      return [result("Portföy değeri", money(total)), result("Portföy durasyonu", fmtNumber(duration, 6)), result("Faiz artışı sonrası portföy değeri", money(total * (1 + impact)))];
    },
    detail: (v) => {
      const values = list(v.marketValues);
      const durations = list(v.durations);
      const total = sum(values);
      const rows = values.map((value, index) => [index + 1, money(value), pct(total === 0 ? 0 : value / total), fmtNumber(durations[index] || 0, 6), fmtNumber((total === 0 ? 0 : value / total) * (durations[index] || 0), 6)]);
      return table("Portföy durasyonu", "SUMPRODUCT(K, ağırlık)", ["Bono", "Piyasa Değeri", "Ağırlık", "Modifiye Durasyon", "Katkı"], rows);
    },
  },
  convexity: {
    inputs: [input("face", "Nominal", "100"), input("coupon", "Kupon Oranı", "6", "%"), input("maturity", "Vade", "5", "yıl"), input("frequency", "Ödeme Sıklığı", "2"), input("yield", "İç Verim Oranı", "6", "%")],
    calc: (v) => {
      const metrics = bondMetrics(cleanNumber(v.face), rate(v.coupon), rate(v.yield), cleanNumber(v.maturity), cleanNumber(v.frequency));
      return [result("Macaulay D", fmtNumber(metrics.macaulay, 6)), result("Modifiye D", fmtNumber(metrics.modified, 6)), result("Konveksite", fmtNumber(metrics.convex, 6)), result("Fiyat", money(metrics.price))];
    },
    detail: (v) => {
      const metrics = bondMetrics(cleanNumber(v.face), rate(v.coupon), rate(v.yield), cleanNumber(v.maturity), cleanNumber(v.frequency));
      const shocks = [-500, -100, -50, -10, -5, -1, 1, 5, 10, 50, 100, 200, 500];
      const rows = shocks.map((shock) => {
        const dr = shock / 10000;
        const durationPart = -100 * metrics.modified * dr;
        const convexPart = 0.5 * 100 * metrics.convex * dr ** 2;
        return [shock, `${fmtNumber(durationPart, 6)}%`, `${fmtNumber(durationPart + convexPart, 6)}%`, `${fmtNumber(convexPart, 6)}%`];
      });
      return table("Konveksite şok tablosu", "Durasyon + konveksite yaklaşımı", ["Faiz Değişimi (bps)", "Durasyon%", "D + Konveksite", "Konveksite Farkı"], rows);
    },
  },
  "price-impact": {
    description: "Bu modüldeki 7 yıllık bono için durasyon ve konveksite ile fiyat etkisini hesaplar.",
    inputs: [input("face", "Nominal", "100"), input("coupon", "Kupon Oranı", "9.875", "%"), input("maturity", "Vade", "7", "yıl"), input("frequency", "Ödeme Sıklığı", "2"), input("yield", "İç Verim Oranı", "8.28", "%"), input("shock", "Faiz Artış Oranı", "5", "%")],
    calc: (v) => {
      const metrics = bondMetrics(cleanNumber(v.face), rate(v.coupon), rate(v.yield), cleanNumber(v.maturity), cleanNumber(v.frequency));
      const dr = rate(v.shock);
      const pctChange = -metrics.modified * dr + 0.5 * metrics.convex * dr ** 2;
      return [result("Modifiye D", fmtNumber(metrics.modified, 6)), result("Konveksite", fmtNumber(metrics.convex, 6)), result("Toplam değişim", pct(pctChange)), result("Yeni fiyat", money(metrics.price * (1 + pctChange)))];
    },
    detail: (v) => {
      const metrics = bondMetrics(cleanNumber(v.face), rate(v.coupon), rate(v.yield), cleanNumber(v.maturity), cleanNumber(v.frequency));
      return table("Fiyat etkisi", "Nakit akışı ve konveksite ham toplamı", ["Kalem", "Değer"], [
        ["Fiyat", money(metrics.price)],
        ["Macaulay D", fmtNumber(metrics.macaulay, 6)],
        ["Modifiye D", fmtNumber(metrics.modified, 6)],
        ["Konveksite", fmtNumber(metrics.convex, 6)],
        ["Faiz Artış Oranı", pct(rate(v.shock))],
      ]);
    },
  },
  "bond-price-convergence": {
    description: "Bu modüldeki fiyat-faiz yakınsama şok tablosunu üretir.",
    inputs: [input("face", "Nominal", "100"), input("coupon", "Kupon Oranı", "6", "%"), input("maturity", "Vade", "5", "yıl"), input("frequency", "Ödeme Sıklığı", "2"), input("yield", "İç Verim Oranı", "6", "%"), input("increment", "Increment", "0.3", "%")],
    calc: (v) => {
      const face = cleanNumber(v.face);
      const coupon = rate(v.coupon);
      const y = rate(v.yield);
      const t = cleanNumber(v.maturity);
      const f = Math.max(1, cleanNumber(v.frequency));
      const metrics = bondMetrics(face, coupon, y, t, f);
      return [
        result("Fiyat", money(metrics.price)),
        result("Macaulay Durasyonu", fmtNumber(metrics.macaulay, 6)),
        result("Modifiye Durasyon", fmtNumber(metrics.modified, 6)),
        result("Konveksite", fmtNumber(metrics.convex, 6)),
      ];
    },
    detail: (v) => {
      const face = cleanNumber(v.face);
      const coupon = rate(v.coupon);
      const maturity = cleanNumber(v.maturity);
      const frequency = cleanNumber(v.frequency);
      const baseYield = rate(v.yield);
      const inc = rate(v.increment);
      const metrics = bondMetrics(face, coupon, baseYield, maturity, frequency);
      const basePrice = metrics.price;
      const modD = metrics.modified;
      const conv = metrics.convex;
      const rows = [];
      const step = inc;
      for (let i = -100; i <= 100; i++) {
        const dy = i * step;
        const y = baseYield + dy;
        const bps = Math.round(dy * 10000);
        const priceActual = bondPrice(face, coupon, y, maturity, frequency);
        const priceDuration = basePrice * (1 - modD * dy);
        const priceDurConv = basePrice * (1 - modD * dy + 0.5 * conv * dy * dy);
        const pctPriceActual = priceActual / basePrice - 1;
        const pctPriceDuration = -modD * dy;
        const pctPriceDurConv = -modD * dy + 0.5 * conv * dy * dy;
        rows.push([
          fmtNumber(bps, 0),
          pct(y),
          money(priceActual),
          money(priceDuration),
          money(priceDurConv),
          pct(pctPriceActual),
          pct(pctPriceDuration),
          pct(pctPriceDurConv),
        ]);
      }
      return table(
        "Bono fiyatı yakınsaması",
        "Durasyon ve Konveksite ile Fiyat Yakınsama Analizi",
        [
          "Faiz Değişimi (bps)",
          "Faiz Oranı",
          "Fiyat",
          "Durasyon Yakınsaması",
          "Durasyon + Konveksite Yakınsaması",
          "% Fiyat Değişimi",
          "% Durasyon Etkisi",
          "% Durasyon + Konveksite Etkisi",
        ],
        rows
      );
    },
  },
  "effective-duration-convexity": {
    inputs: [input("face", "Nominal", "100"), input("coupon", "Kupon Oranı", "9.875", "%"), input("maturity", "Vade", "7", "yıl"), input("frequency", "Ödeme Sıklığı", "2"), input("yield", "İç Verim Oranı", "8.28", "%"), input("shock", "Şok", "0.5", "%")],
    calc: (v) => {
      const face = cleanNumber(v.face);
      const coupon = rate(v.coupon);
      const maturity = cleanNumber(v.maturity);
      const frequency = cleanNumber(v.frequency);
      const y = rate(v.yield);
      const dy = rate(v.shock);
      const p0 = bondPrice(face, coupon, y, maturity, frequency);
      const pDown = bondPrice(face, coupon, y - dy, maturity, frequency);
      const pUp = bondPrice(face, coupon, y + dy, maturity, frequency);
      const d = (pDown - pUp) / (2 * p0 * dy);
      const c = (pDown + pUp - 2 * p0) / (p0 * dy ** 2);
      return [result("Efektif Durasyon", fmtNumber(d, 6)), result("Efektif Konveksite", fmtNumber(c, 6)), result("P(0)", money(p0)), result("P(-) / P(+)", `${money(pDown)} / ${money(pUp)}`)];
    },
    detail: (v) => {
      const face = cleanNumber(v.face);
      const coupon = rate(v.coupon);
      const maturity = cleanNumber(v.maturity);
      const frequency = cleanNumber(v.frequency);
      const y = rate(v.yield);
      const dy = rate(v.shock);
      const p0 = bondPrice(face, coupon, y, maturity, frequency);
      const pDown = bondPrice(face, coupon, y - dy, maturity, frequency);
      const pUp = bondPrice(face, coupon, y + dy, maturity, frequency);
      return table("Efektif ölçüler", "P(-), P(0), P(+) ile hesap", ["Kalem", "Değer"], [
        ["P(0)", money(p0)],
        ["P(-)", money(pDown)],
        ["P(+)", money(pUp)],
        ["Efektif Durasyon", fmtNumber((pDown - pUp) / (2 * p0 * dy), 6)],
        ["Efektif Konveksite", fmtNumber((pDown + pUp - 2 * p0) / (p0 * dy ** 2), 6)],
      ]);
    },
  },
  "interest-price": {
    description: "Bu modüldeki FİYAT, YÜZDESEL FİYAT DEĞİŞİMİ ve bir baz puanın fiyat değeri tablosunu oluşturur.",
    formula: ["Fiyat = c x ((1 - 1/(1+y/2)^n)/(y/2)) + 100/(1+y/2)^n", "% Değişim = (Yeni Fiyat - Baz Fiyat) / Baz Fiyat", "DV01 = ortalama bir baz puan fiyat farkı"],
    inputs: [input("rates", "Faiz satırları", "4; 5; 5.5; 5.9; 5.99; 6; 6.01; 6.1; 6.5; 7; 8", "%", "text")],
    calc: (v) => {
      const rates = smartRateList(v.rates);
      const base = 0.06;
      const price6y5 = bondPrice(100, 0.06, base, 5, 2);
      const price6y20 = bondPrice(100, 0.06, base, 20, 2);
      const near = rates.includes(base) ? base : rates[Math.floor(rates.length / 2)] || base;
      return [result("6% / 5yıl baz fiyat", money(price6y5)), result("6% / 20yıl baz fiyat", money(price6y20)), result("Seçili baz faiz", pct(near))];
    },
    detail: (v) => {
      const rates = smartRateList(v.rates);
      const cases = [
        ["6% / 5yıl", 0.06, 5],
        ["6% / 20yıl", 0.06, 20],
        ["9% / 5yıl", 0.09, 5],
        ["9% / 20yıl", 0.09, 20],
      ];
      const basePrices = cases.map(([, coupon, maturity]) => bondPrice(100, coupon, 0.06, maturity, 2));
      const rows = rates.map((r) => [
        pct(r),
        ...cases.map(([, coupon, maturity]) => money(bondPrice(100, coupon, r, maturity, 2))),
        ...cases.map(([, coupon, maturity], index) => pct(bondPrice(100, coupon, r, maturity, 2) / basePrices[index] - 1)),
      ]);
      return table("Faiz & fiyat", "Fiyat ve yüzdesel değişim matrisi", ["Faiz", ...cases.map(([name]) => name), ...cases.map(([name]) => `% ${name}`)], rows);
    },
  },
});

Object.assign(moduleOverrides, {
  "parametric-var-position": {
    description: "Bu modüldeki tek bono pozisyonu için fiyat, PV, volatilite, ALFA ve sermaye gereksinimi hesaplar.",
    formula: ["Fiyat = Nominal / (1 + Faiz oranı x VKGS / 365)", "PV = Fiyat x Bono Adeti", "ALFA = ROUNDUP(NORMINV(Güven Aralığı), 2)", "VaR(1 Gün) = ALFA x Fiyat x Volatilite x Bono Adeti", "VaR(10 Gün) = VaR(1 Gün) x SQRT(10)", "Sermaye Gereksinimi = k x VaR(10 Gün)"],
    variables: variables("VKGS:Vadeye kalan gün sayısı|ALFA:Normal dağılım güven katsayısı|k:Sermaye çarpanı|Volatilite:Seçilen tarihsel pencerenin standart sapması"),
    inputs: [
      input("nominal", "Nominal", "100000", "TL"),
      input("days", "VKGS", "185", "gün"),
      input("rate", "Faiz oranı", "8.220718952762017", "%"),
      input("bonds", "Bono Adeti", "100"),
      input("confidence", "GÜVEN ARALIĞI", "99", "%"),
      input("vol", "Volatilite", "0.165156351882198", "%"),
      input("k", "k", "3"),
    ],
    calc: (v) => {
      const price = cleanNumber(v.nominal) / (1 + rate(v.rate) * cleanNumber(v.days) / 365);
      const pv = price * cleanNumber(v.bonds);
      const alpha = roundUp2(normInv(rate(v.confidence)));
      const var1 = alpha * price * rate(v.vol) * cleanNumber(v.bonds);
      const var10 = var1 * Math.sqrt(10);
      return [result("Fiyat", money(price)), result("PV", money(pv)), result("ALFA", fmtNumber(alpha, 2)), result("VaR (1 Gün)", money(var1)), result("Sermaye Gereksinimi", money(cleanNumber(v.k) * var10))];
    },
    detail: (v) => {
      const price = cleanNumber(v.nominal) / (1 + rate(v.rate) * cleanNumber(v.days) / 365);
      const pv = price * cleanNumber(v.bonds);
      const alpha = roundUp2(normInv(rate(v.confidence)));
      const var1 = alpha * price * rate(v.vol) * cleanNumber(v.bonds);
      const var10 = var1 * Math.sqrt(10);
      return table("Parametrik VaR-Pozisyon", "Mayıs 2013 sonrası varsayılan volatiliteyle", ["Kalem", "Değer"], [
        ["Fiyat", money(price)],
        ["PV", money(pv)],
        ["Volatilite", pct(rate(v.vol))],
        ["ALFA", fmtNumber(alpha, 2)],
        ["VaR (1 Gün)", money(var1)],
        ["VaR / PV", pct(var1 / pv)],
        ["VaR (10 Gün)", money(var10)],
        ["Sermaye Gereksinimi", money(cleanNumber(v.k) * var10)],
      ]);
    },
  },
  "parametric-var-portfolio": {
    description: "Bu modüldeki dört pozisyonlu portföy için ağırlıklar, kovaryans matrisi, portföy sigması ve VaR hesaplar.",
    formula: ["w_i = PV_i / ΣPV", "σ_Portföy = SQRT(w'Σw)", "VaR(1 Gün) = σ_Portföy x PV x ALFA", "VaR(10 Gün) = VaR(1 Gün) x SQRT(10)"],
    variables: variables("Σ:Risk faktörü kovaryans matrisi|w:Pozisyon ağırlıkları|σ_Portföy:Portföy günlük volatilitesi|ALFA:Normal dağılım güven katsayısı"),
    inputs: [
      input("values", "PV", "65000000; 50000000; 35000000; 20000000", "TL", "text"),
      input("confidence", "Güven Aralığı", "99", "%"),
      input("k", "k", "3"),
      input("period", "Dönem", "Mayıs 2013 Sonrası", "", "select", "", null, ["Mayıs 2013 Öncesi", "Mayıs 2013 Sonrası"]),
    ],
    calc: (v) => {
      const values = list(v.values);
      const total = sum(values);
      const weights = values.map((item) => (total === 0 ? 0 : item / total));
      const before = [
        [2.2807557195747338e-7, 2.2603509656337287e-7, 1.9976322665106805e-7, 1.7115012473252568e-7],
        [2.2603509656337287e-7, 2.2957677908702365e-7, 2.0085157881145485e-7, 1.6921526383007172e-7],
        [2.2957677908702365e-7, 2.0085157881145485e-7, 2.45446487246074e-7, 1.9848253148851607e-7],
        [1.7115012473252568e-7, 1.6921526383007172e-7, 1.9848253148851607e-7, 2.047629529069023e-7],
      ];
      const after = [
        [2.73135614389054e-6, 2.7095984773198013e-6, 2.6907165572403326e-6, 2.6284309697801196e-6],
        [2.7095984773198013e-6, 2.7276620567036406e-6, 2.6904381309159443e-6, 2.6282598368205326e-6],
        [2.7276620567036406e-6, 2.6904381309159443e-6, 2.7076526099665703e-6, 2.6343878484233226e-6],
        [2.6284309697801196e-6, 2.6282598368205326e-6, 2.6343878484233226e-6, 2.6609454093879166e-6],
      ];
      const matrixBase = String(v.period).toLocaleLowerCase("tr-TR").includes("sonrası") ? after : before;
      const matrix = getCovarianceMatrix(matrixBase, values.length);
      const sigma2 = sum(weights.map((wi, i) => sum(weights.map((wj, j) => wi * wj * matrix[i][j]))));
      const sigma = Math.sqrt(sigma2);
      const alpha = roundUp2(normInv(rate(v.confidence)));
      const var1 = sigma * total * alpha;
      return [result("σPortföy", pct(sigma)), result("PV", money(total)), result("VaR (1 Gün)", money(var1)), result("Sermaye Gereksinimi", money(cleanNumber(v.k) * var1 * Math.sqrt(10)))];
    },
    detail: (v) => {
      const values = list(v.values);
      const total = sum(values);
      const weights = values.map((item) => (total === 0 ? 0 : item / total));
      return table("Ağırlık tablosu", "Kovaryans matrisi hesapta kullanılır", ["Pozisyon", "PV", "w (Ağırlık)"], values.map((value, index) => [`Pozisyon ${index + 1}`, money(value), pct(weights[index])]));
    },
  },
  "historical-simulation": {
    description: "Bu modüldeki tarihsel benzetim mantığıyla tarihsel fiyat/PV değişimlerinden percentile VaR hesaplar.",
    formula: ["Bono Fiyatı_t = Nominal / (1 + Faiz Oranı_t x VKGS / 365)", "PV_t = Bono Fiyatı_t x Bono Adeti", "K/Z_t = PV_t - PV_t-1", "VaR(1 Gün) = ABS(PERCENTILE(K/Z, 1 - Güven Aralığı))"],
    variables: variables("Nominal:Bono nominal değeri|VKGS:Vadeye kalan gün sayısı|Bono Adeti:Portföydeki kıymet miktarı|Dönem:Tarihsel getiri veri seti dönemi"),
    inputs: [
      input("nominal", "Nominal", "100000", "TL"),
      input("days", "VKGS", "185", "gün"),
      input("bonds", "Bono Adeti", "100"),
      input("confidence", "GÜVEN ARALIĞI", "99", "%"),
      input("k", "k", "3"),
      input("period", "Dönem", "Mayıs 2013 Öncesi", "", "select", "", null, ["Mayıs 2013 Öncesi", "Mayıs 2013 Sonrası"]),
    ],
    calc: (v) => {
      const nominal = cleanNumber(v.nominal);
      const days = cleanNumber(v.days);
      const bonds = cleanNumber(v.bonds);
      const conf = rate(v.confidence);
      const k = cleanNumber(v.k);
      const beforeRates = [0.09623100000000001, 0.095993, 0.095753, 0.096008, 0.09648300000000001, 0.09713799999999999, 0.09819800000000001, 0.098026, 0.097806, 0.098506, 0.099092, 0.099192, 0.099492, 0.099229, 0.099367, 0.099337, 0.099677, 0.099737, 0.099827, 0.099952, 0.09950200000000001, 0.09990199999999999, 0.099825, 0.099925, 0.099727, 0.099647, 0.099157, 0.098871, 0.09897500000000001, 0.098724, 0.098822, 0.099145, 0.09867100000000001, 0.09820999999999999, 0.09807, 0.097765, 0.097682, 0.097218, 0.09609899999999999, 0.096511, 0.095972, 0.095025, 0.094847, 0.093978, 0.093375, 0.091241, 0.090654, 0.089636, 0.08886699999999999, 0.08821799999999999, 0.08762299999999999, 0.086424, 0.08612700000000001, 0.086044, 0.08614699999999999, 0.08620900000000001, 0.08544800000000001, 0.08508800000000001, 0.08504899999999999, 0.08555199999999999, 0.08509, 0.084787, 0.08338699999999999, 0.082103, 0.08194599999999999, 0.080621, 0.080594, 0.080216, 0.078992, 0.078823, 0.07882200000000001, 0.078936, 0.07962, 0.079463, 0.07912, 0.079546, 0.07964299999999999, 0.078628, 0.077576, 0.077551, 0.077236, 0.077432, 0.077002, 0.076365, 0.076138, 0.075864, 0.07549, 0.07546, 0.07521, 0.074986, 0.074713, 0.074516, 0.074067, 0.073286, 0.073359, 0.072793, 0.072815, 0.072976, 0.072321, 0.07217699999999999, 0.072145, 0.071703, 0.070624, 0.07042799999999999, 0.070746, 0.070194, 0.07048600000000001, 0.070322, 0.070273, 0.07062700000000001, 0.070463, 0.070637, 0.07085899999999999, 0.070558, 0.070752, 0.07094400000000001, 0.07110999999999999, 0.070622, 0.070217, 0.070126, 0.06973, 0.069327, 0.069111, 0.068554, 0.06804199999999999, 0.068001, 0.067593, 0.067595, 0.067704, 0.067094, 0.06636199999999999, 0.066007, 0.065708, 0.065471, 0.06472800000000001, 0.064061, 0.063143, 0.062225, 0.061368, 0.060323, 0.060456, 0.058868000000000004, 0.059063, 0.058830999999999994, 0.058263999999999996, 0.058132, 0.058283, 0.058283, 0.057972, 0.058003, 0.057714, 0.056898, 0.056358, 0.055878, 0.05533299999999999, 0.055023, 0.055506, 0.055925, 0.05581, 0.055963000000000006, 0.055896999999999995, 0.055689999999999996, 0.055698, 0.054736, 0.054890999999999995, 0.055466999999999995, 0.056399, 0.056756, 0.057141000000000004, 0.057521, 0.057521, 0.057678, 0.058284, 0.058346999999999996, 0.058688000000000004, 0.058688000000000004, 0.058574, 0.059175000000000005, 0.060265000000000006, 0.05935000000000001, 0.05771, 0.057310999999999994, 0.057775, 0.058579, 0.059122, 0.0592, 0.058685, 0.058285000000000003, 0.058642, 0.058774, 0.057946, 0.056878000000000005, 0.056860999999999995, 0.056314, 0.05594300000000001, 0.055684000000000004, 0.055745, 0.054961, 0.05465, 0.054644000000000005, 0.054601, 0.054495, 0.053773, 0.053543, 0.05381299999999999, 0.054125, 0.053696, 0.053797, 0.054437, 0.054081000000000004, 0.053776000000000004, 0.053229, 0.053209, 0.053190999999999995, 0.053121999999999996, 0.053147, 0.053117, 0.052908, 0.053071, 0.053076, 0.052946, 0.052901, 0.052934999999999996, 0.053202, 0.053401, 0.053455, 0.053915, 0.054245, 0.055174, 0.055778, 0.056917999999999996, 0.057462, 0.057436, 0.057841000000000004, 0.058397, 0.058578, 0.05888499999999999, 0.059188, 0.059125, 0.059258, 0.060781999999999996, 0.060536000000000006, 0.059345999999999996, 0.058117, 0.057202, 0.057027999999999995, 0.056178, 0.05509, 0.05463199999999999, 0.054341999999999994, 0.053544999999999995, 0.052941, 0.052941, 0.052811000000000004, 0.052441, 0.05244, 0.051972, 0.052069000000000004, 0.051806, 0.050974000000000005, 0.050317999999999995];
      const afterRates = [0.058283, 0.058283, 0.057972, 0.058003, 0.057714, 0.056898, 0.056358, 0.055878, 0.05533299999999999, 0.055023, 0.055506, 0.055925, 0.05581, 0.055963000000000006, 0.055896999999999995, 0.055689999999999996, 0.055698, 0.054736, 0.054890999999999995, 0.055466999999999995, 0.056399, 0.056756, 0.057141000000000004, 0.057521, 0.057521, 0.057678, 0.058284, 0.058346999999999996, 0.058688000000000004, 0.058688000000000004, 0.058574, 0.059175000000000005, 0.060265000000000006, 0.05935000000000001, 0.05771, 0.057310999999999994, 0.057775, 0.058579, 0.059122, 0.0592, 0.058685, 0.058285000000000003, 0.058642, 0.058774, 0.057946, 0.056878000000000005, 0.056860999999999995, 0.056314, 0.05594300000000001, 0.055684000000000004, 0.055745, 0.054961, 0.05465, 0.054644000000000005, 0.054601, 0.054495, 0.053773, 0.053543, 0.05381299999999999, 0.054125, 0.053696, 0.053797, 0.054437, 0.054081000000000004, 0.053776000000000004, 0.053229, 0.053209, 0.053190999999999995, 0.053121999999999996, 0.053147, 0.053117, 0.052908, 0.053071, 0.053076, 0.052946, 0.052901, 0.052934999999999996, 0.053202, 0.053401, 0.053455, 0.053915, 0.054245, 0.055174, 0.055778, 0.056917999999999996, 0.057462, 0.057436, 0.057841000000000004, 0.058397, 0.058578, 0.05888499999999999, 0.059188, 0.059125, 0.059258, 0.060781999999999996, 0.060536000000000006, 0.059345999999999996, 0.058117, 0.057202, 0.057027999999999995, 0.056178, 0.05509, 0.05463199999999999, 0.054341999999999994, 0.053544999999999995, 0.052941, 0.052941, 0.052811000000000004, 0.052441, 0.05244, 0.051972, 0.052069000000000004, 0.051806, 0.050974000000000005, 0.050317999999999995, 0.049486, 0.04953300000000001, 0.049121, 0.04902, 0.048324, 0.047377, 0.04693, 0.046402, 0.046079, 0.046068, 0.045044, 0.044243, 0.045493, 0.047057, 0.047251, 0.049, 0.048978, 0.04861, 0.048901, 0.051057, 0.053352000000000004, 0.055232, 0.059432, 0.058907, 0.061677, 0.063308, 0.06456, 0.065908, 0.07075999999999999, 0.068054, 0.06603500000000001, 0.06254900000000001, 0.062252, 0.064164, 0.064656, 0.071196, 0.077599, 0.080791, 0.07861699999999999, 0.078524, 0.075234, 0.075444, 0.074908, 0.07262400000000001, 0.07575899999999999, 0.076185, 0.07801999999999999, 0.078407, 0.081638, 0.085383, 0.089436, 0.089581, 0.087384, 0.086641, 0.08478899999999999, 0.083948, 0.08415900000000001, 0.084409, 0.084053, 0.084522, 0.087046, 0.088353, 0.089073, 0.088206, 0.088008, 0.08611700000000001, 0.08612299999999999, 0.08401299999999999, 0.08425200000000001, 0.084424, 0.084424, 0.084428, 0.083897, 0.084937, 0.08590999999999999, 0.086642, 0.08625500000000001, 0.087279, 0.087837, 0.088821, 0.093234, 0.094473, 0.095806, 0.094557, 0.09452400000000001, 0.093277, 0.093278, 0.092828, 0.093111, 0.09179999999999999, 0.09114499999999999, 0.09008699999999999, 0.089309, 0.089968, 0.089019, 0.08851200000000001, 0.087768, 0.08477399999999999, 0.085171, 0.08330299999999999, 0.076261, 0.078277, 0.078526, 0.07879699999999999, 0.078513, 0.078868, 0.080634, 0.08153, 0.08053300000000001, 0.0805, 0.080422, 0.080906, 0.08148899999999999, 0.079159, 0.077949, 0.078641, 0.078378, 0.078377, 0.078374, 0.0783, 0.078301, 0.078301, 0.075946, 0.07544100000000001, 0.07319200000000001, 0.073571, 0.073577, 0.07355400000000001, 0.073354, 0.073423, 0.074452, 0.076552, 0.077675, 0.078642, 0.078888, 0.079213, 0.080368, 0.08437599999999999, 0.086074, 0.08542, 0.084555, 0.084315, 0.083842, 0.08457699999999999, 0.08622, 0.087025];
      const rates = String(v.period).toLocaleLowerCase("tr-TR").includes("sonrası") ? afterRates : beforeRates;

      const pvs = rates.map((r) => {
        const price = nominal / (1 + r * days / 365);
        return price * bonds;
      });

      const pnl = [];
      for (let i = 1; i < pvs.length; i++) {
        pnl.push(pvs[i] - pvs[i - 1]);
      }

      const var1 = Math.abs(percentileInc(pnl, 1 - conf));
      const pv = (nominal / (1 + 0.08220718952762017 * days / 365)) * bonds;
      const var10 = var1 * Math.sqrt(10);
      return [
        result("VaR (1 Gün)", money(var1)),
        result("VaR / PV", pct(var1 / pv)),
        result("VaR (10 Gün)", money(var10)),
        result("Sermaye Gereksinimi", money(k * var10)),
      ];
    },
    detail: (v) => {
      const nominal = cleanNumber(v.nominal);
      const days = cleanNumber(v.days);
      const bonds = cleanNumber(v.bonds);
      const conf = rate(v.confidence);

      const beforeRates = [0.09623100000000001, 0.095993, 0.095753, 0.096008, 0.09648300000000001, 0.09713799999999999, 0.09819800000000001, 0.098026, 0.097806, 0.098506, 0.099092, 0.099192, 0.099492, 0.099229, 0.099367, 0.099337, 0.099677, 0.099737, 0.099827, 0.099952, 0.09950200000000001, 0.09990199999999999, 0.099825, 0.099925, 0.099727, 0.099647, 0.099157, 0.098871, 0.09897500000000001, 0.098724, 0.098822, 0.099145, 0.09867100000000001, 0.09820999999999999, 0.09807, 0.097765, 0.097682, 0.097218, 0.09609899999999999, 0.096511, 0.095972, 0.095025, 0.094847, 0.093978, 0.093375, 0.091241, 0.090654, 0.089636, 0.08886699999999999, 0.08821799999999999, 0.08762299999999999, 0.086424, 0.08612700000000001, 0.086044, 0.08614699999999999, 0.08620900000000001, 0.08544800000000001, 0.08508800000000001, 0.08504899999999999, 0.08555199999999999, 0.08509, 0.084787, 0.08338699999999999, 0.082103, 0.08194599999999999, 0.080621, 0.080594, 0.080216, 0.078992, 0.078823, 0.07882200000000001, 0.078936, 0.07962, 0.079463, 0.07912, 0.079546, 0.07964299999999999, 0.078628, 0.077576, 0.077551, 0.077236, 0.077432, 0.077002, 0.076365, 0.076138, 0.075864, 0.07549, 0.07546, 0.07521, 0.074986, 0.074713, 0.074516, 0.074067, 0.073286, 0.073359, 0.072793, 0.072815, 0.072976, 0.072321, 0.07217699999999999, 0.072145, 0.071703, 0.070624, 0.07042799999999999, 0.070746, 0.070194, 0.07048600000000001, 0.070322, 0.070273, 0.07062700000000001, 0.070463, 0.070637, 0.07085899999999999, 0.070558, 0.070752, 0.07094400000000001, 0.07110999999999999, 0.070622, 0.070217, 0.070126, 0.06973, 0.069327, 0.069111, 0.068554, 0.06804199999999999, 0.068001, 0.067593, 0.067595, 0.067704, 0.067094, 0.06636199999999999, 0.066007, 0.065708, 0.065471, 0.06472800000000001, 0.064061, 0.063143, 0.062225, 0.061368, 0.060323, 0.060456, 0.058868000000000004, 0.059063, 0.058830999999999994, 0.058263999999999996, 0.058132, 0.058283, 0.058283, 0.057972, 0.058003, 0.057714, 0.056898, 0.056358, 0.055878, 0.05533299999999999, 0.055023, 0.055506, 0.055925, 0.05581, 0.055963000000000006, 0.055896999999999995, 0.055689999999999996, 0.055698, 0.054736, 0.054890999999999995, 0.055466999999999995, 0.056399, 0.056756, 0.057141000000000004, 0.057521, 0.057521, 0.057678, 0.058284, 0.058346999999999996, 0.058688000000000004, 0.058688000000000004, 0.058574, 0.059175000000000005, 0.060265000000000006, 0.05935000000000001, 0.05771, 0.057310999999999994, 0.057775, 0.058579, 0.059122, 0.0592, 0.058685, 0.058285000000000003, 0.058642, 0.058774, 0.057946, 0.056878000000000005, 0.056860999999999995, 0.056314, 0.05594300000000001, 0.055684000000000004, 0.055745, 0.054961, 0.05465, 0.054644000000000005, 0.054601, 0.054495, 0.053773, 0.053543, 0.05381299999999999, 0.054125, 0.053696, 0.053797, 0.054437, 0.054081000000000004, 0.053776000000000004, 0.053229, 0.053209, 0.053190999999999995, 0.053121999999999996, 0.053147, 0.053117, 0.052908, 0.053071, 0.053076, 0.052946, 0.052901, 0.052934999999999996, 0.053202, 0.053401, 0.053455, 0.053915, 0.054245, 0.055174, 0.055778, 0.056917999999999996, 0.057462, 0.057436, 0.057841000000000004, 0.058397, 0.058578, 0.05888499999999999, 0.059188, 0.059125, 0.059258, 0.060781999999999996, 0.060536000000000006, 0.059345999999999996, 0.058117, 0.057202, 0.057027999999999995, 0.056178, 0.05509, 0.05463199999999999, 0.054341999999999994, 0.053544999999999995, 0.052941, 0.052941, 0.052811000000000004, 0.052441, 0.05244, 0.051972, 0.052069000000000004, 0.051806, 0.050974000000000005, 0.050317999999999995];
      const afterRates = [0.058283, 0.058283, 0.057972, 0.058003, 0.057714, 0.056898, 0.056358, 0.055878, 0.05533299999999999, 0.055023, 0.055506, 0.055925, 0.05581, 0.055963000000000006, 0.055896999999999995, 0.055689999999999996, 0.055698, 0.054736, 0.054890999999999995, 0.055466999999999995, 0.056399, 0.056756, 0.057141000000000004, 0.057521, 0.057521, 0.057678, 0.058284, 0.058346999999999996, 0.058688000000000004, 0.058688000000000004, 0.058574, 0.059175000000000005, 0.060265000000000006, 0.05935000000000001, 0.05771, 0.057310999999999994, 0.057775, 0.058579, 0.059122, 0.0592, 0.058685, 0.058285000000000003, 0.058642, 0.058774, 0.057946, 0.056878000000000005, 0.056860999999999995, 0.056314, 0.05594300000000001, 0.055684000000000004, 0.055745, 0.054961, 0.05465, 0.054644000000000005, 0.054601, 0.054495, 0.053773, 0.053543, 0.05381299999999999, 0.054125, 0.053696, 0.053797, 0.054437, 0.054081000000000004, 0.053776000000000004, 0.053229, 0.053209, 0.053190999999999995, 0.053121999999999996, 0.053147, 0.053117, 0.052908, 0.053071, 0.053076, 0.052946, 0.052901, 0.052934999999999996, 0.053202, 0.053401, 0.053455, 0.053915, 0.054245, 0.055174, 0.055778, 0.056917999999999996, 0.057462, 0.057436, 0.057841000000000004, 0.058397, 0.058578, 0.05888499999999999, 0.059188, 0.059125, 0.059258, 0.060781999999999996, 0.060536000000000006, 0.059345999999999996, 0.058117, 0.057202, 0.057027999999999995, 0.056178, 0.05509, 0.05463199999999999, 0.054341999999999994, 0.053544999999999995, 0.052941, 0.052941, 0.052811000000000004, 0.052441, 0.05244, 0.051972, 0.052069000000000004, 0.051806, 0.050974000000000005, 0.050317999999999995, 0.049486, 0.04953300000000001, 0.049121, 0.04902, 0.048324, 0.047377, 0.04693, 0.046402, 0.046079, 0.046068, 0.045044, 0.044243, 0.045493, 0.047057, 0.047251, 0.049, 0.048978, 0.04861, 0.048901, 0.051057, 0.053352000000000004, 0.055232, 0.059432, 0.058907, 0.061677, 0.063308, 0.06456, 0.065908, 0.07075999999999999, 0.068054, 0.06603500000000001, 0.06254900000000001, 0.062252, 0.064164, 0.064656, 0.071196, 0.077599, 0.080791, 0.07861699999999999, 0.078524, 0.075234, 0.075444, 0.074908, 0.07262400000000001, 0.07575899999999999, 0.076185, 0.07801999999999999, 0.078407, 0.081638, 0.085383, 0.089436, 0.089581, 0.087384, 0.086641, 0.08478899999999999, 0.083948, 0.08415900000000001, 0.084409, 0.084053, 0.084522, 0.087046, 0.088353, 0.089073, 0.088206, 0.088008, 0.08611700000000001, 0.08612299999999999, 0.08401299999999999, 0.08425200000000001, 0.084424, 0.084424, 0.084428, 0.083897, 0.084937, 0.08590999999999999, 0.086642, 0.08625500000000001, 0.087279, 0.087837, 0.088821, 0.093234, 0.094473, 0.095806, 0.094557, 0.09452400000000001, 0.093277, 0.093278, 0.092828, 0.093111, 0.09179999999999999, 0.09114499999999999, 0.09008699999999999, 0.089309, 0.089968, 0.089019, 0.08851200000000001, 0.087768, 0.08477399999999999, 0.085171, 0.08330299999999999, 0.076261, 0.078277, 0.078526, 0.07879699999999999, 0.078513, 0.078868, 0.080634, 0.08153, 0.08053300000000001, 0.0805, 0.080422, 0.080906, 0.08148899999999999, 0.079159, 0.077949, 0.078641, 0.078378, 0.078377, 0.078374, 0.0783, 0.078301, 0.078301, 0.075946, 0.07544100000000001, 0.07319200000000001, 0.073571, 0.073577, 0.07355400000000001, 0.073354, 0.073423, 0.074452, 0.076552, 0.077675, 0.078642, 0.078888, 0.079213, 0.080368, 0.08437599999999999, 0.086074, 0.08542, 0.084555, 0.084315, 0.083842, 0.08457699999999999, 0.08622, 0.087025];
      const rates = String(v.period).toLocaleLowerCase("tr-TR").includes("sonrası") ? afterRates : beforeRates;

      const pvs = rates.map((r) => {
        const price = nominal / (1 + r * days / 365);
        return price * bonds;
      });

      const pnl = [];
      for (let i = 1; i < pvs.length; i++) {
        pnl.push(pvs[i] - pvs[i - 1]);
      }

      const sorted = [...pnl].sort((a, b) => a - b);
      const var1 = Math.abs(percentileInc(pnl, 1 - conf));
      return table("Tarihsel benzetim", "Sıralı K/Z (kâr/zarar) senaryoları", ["Sıra", "K/Z Değeri"], sorted.map((item, index) => [index + 1, money(item)]).concat([["VaR (1 Gün)", money(var1)]]));
    },
  },
  "macro-hedge": {
    detail: (v) => {
      const asset = cleanNumber(v.asset);
      const liability = cleanNumber(v.liability);
      const assetDuration = cleanNumber(v.assetDuration);
      const liabilityDuration = cleanNumber(v.liabilityDuration);
      const shock = rate(v.shock);
      const equity = cleanNumber(v.equity);
      const initialGap = asset === 0 ? 0 : assetDuration - liabilityDuration * (liability / asset);
      const swapNominal = 1866.666666666669;
      const swapAssetDuration = 0.5;
      const swapLiabilityDuration = 2;
      const newAsset = asset + swapNominal;
      const newLiability = liability + swapNominal;
      const newAssetDuration = (asset * assetDuration + swapNominal * swapAssetDuration) / newAsset;
      const newLiabilityDuration = (liability * liabilityDuration + swapNominal * swapLiabilityDuration) / newLiability;
      const newGap = newAssetDuration - newLiabilityDuration * (newLiability / newAsset);
      return table("Makro Hedge", "Swap dahil bilanço durasyon gap hesabı", ["Kalem", "Başlangıç", "Swap Dahil"], [
        ["Asset Tutar", fmtNumber(asset, 6), fmtNumber(newAsset, 6)],
        ["Liability Tutar", fmtNumber(liability, 6), fmtNumber(newLiability, 6)],
        ["Asset Durasyon", fmtNumber(assetDuration, 6), fmtNumber(newAssetDuration, 6)],
        ["Liability Durasyon", fmtNumber(liabilityDuration, 6), fmtNumber(newLiabilityDuration, 6)],
        ["Durasyon GAP", fmtNumber(initialGap, 6), fmtNumber(newGap, 6)],
        ["Şok Sonrası Erime", pct(((-asset * assetDuration * shock) - (-liability * liabilityDuration * shock)) / equity), pct(((-newAsset * newAssetDuration * shock) - (-newLiability * newLiabilityDuration * shock)) / equity)],
      ]);
    },
  },
  bootstrap: {
    description: "Bu modüldeki yarı yıllık bootstrap adımlarıyla spot eğri üretir.",
    formula: ["Sıfır kuponlar için Spot = İç Verim Oranı", "Spot_n = 2 x (((Kupon + 100) / (Fiyat - önceki kupon PV toplamı))^(1/(2 x Vade)) - 1)"],
    inputs: [
      input("maturities", "Vade", "0.5;1;1.5;2;2.5;3;3.5;4;4.5;5", "", "text"),
      input("coupons", "Kupon", "0;0;8.5;9;11;9.5;10;10;11.5;8.75", "%", "text"),
      input("yields", "İç Verim Oranı", "8;8.3;8.9;9.2;9.4;9.7;10;10.4;10.6;10.8", "%", "text"),
      input("prices", "Fiyat", "96.15;92.19;99.45;99.64;103.49;99.49;100;98.72;103.16;92.24", "", "text"),
    ],
    calc: (v) => {
      const maturities = list(v.maturities);
      const coupons = smartRateList(v.coupons);
      const yields = smartRateList(v.yields);
      const prices = list(v.prices);
      const spots = [];
      maturities.forEach((maturity, index) => {
        if ((coupons[index] || 0) === 0) {
          spots.push(yields[index] || 0);
          return;
        }
        const periods = Math.round(maturity * 2);
        const couponPayment = (coupons[index] * 100) / 2;
        const previousPv = sum(Array.from({ length: periods - 1 }, (_, pIndex) => couponPayment / pow(1 + spots[pIndex] / 2, pIndex + 1)));
        const finalFlow = couponPayment + 100;
        spots.push(2 * (pow(finalFlow / (prices[index] - previousPv), 1 / periods) - 1));
      });
      return [result("Son spot", pct(spots[spots.length - 1] || 0)), result("Spot sayısı", fmtNumber(spots.length, 0)), result("3Y spot", pct(spots[5] || 0))];
    },
    detail: (v) => {
      const maturities = list(v.maturities);
      const coupons = smartRateList(v.coupons);
      const yields = smartRateList(v.yields);
      const prices = list(v.prices);
      const spots = [];
      const rows = maturities.map((maturity, index) => {
        if ((coupons[index] || 0) === 0) {
          spots.push(yields[index] || 0);
        } else {
          const periods = Math.round(maturity * 2);
          const couponPayment = (coupons[index] * 100) / 2;
          const previousPv = sum(Array.from({ length: periods - 1 }, (_, pIndex) => couponPayment / pow(1 + spots[pIndex] / 2, pIndex + 1)));
          const finalFlow = couponPayment + 100;
          spots.push(2 * (pow(finalFlow / (prices[index] - previousPv), 1 / periods) - 1));
        }
        return [maturity, pct(coupons[index] || 0), pct(yields[index] || 0), fmtNumber(prices[index] || 0, 4), pct(spots[index] || 0)];
      });
      return table("Bootstrap", "Spot kolonunun adım adım çözümü", ["Vade", "Kupon", "İç Verim Oranı", "Fiyat", "Spot"], rows);
    },
  },
  "echols-elliott": {
    description: "Bu modüldeki S23 VKGS/Yield datasına doğrusal regresyon uygular ve residual çıktısını gösterir.",
    formula: ["Yield = Intercept + β x VKGS", "R² = 1 - SS_res / SS_total"],
    inputs: [input("maturity", "VKGS", "1800", "gün")],
    calc: (v) => {
      const intercept = 0.6441150736525305;
      const slope = 0.0002697877900613368;
      const predicted = intercept + slope * cleanNumber(v.maturity);
      return [result("Intercept", fmtNumber(intercept, 8)), result("X Variable 1", fmtNumber(slope, 10)), result("Tahmini Yield", `${fmtNumber(predicted, 6)}%`), result("R Square", fmtNumber(0.713724368387229, 6))];
    },
    detail: () => {
      const days = [1, 2, 7, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 720, 1080, 1440, 1800, 2160, 2520, 2880, 3240, 3600, 3960, 4320, 5400, 7200, 9000, 10800, 14400, 18000];
      const yields = [0.1033, 0.22, 0.13015, 0.164, 0.205, 0.2366, 0.2193, 0.2275, 0.2435, 0.2365, 0.2398, 0.2555, 0.2513, 0.2571, 0.268, 0.3798, 0.6445, 1.027, 1.4415, 1.8203, 2.1405, 2.3975, 2.6093, 2.7865, 2.9377, 3.0612, 3.3273, 3.549, 3.656, 3.7165, 3.7358, 3.7185];
      const intercept = 0.6441150736525305;
      const slope = 0.0002697877900613368;
      const rows = days.map((day, index) => [index + 1, day, `${fmtNumber(yields[index], 6)}%`, `${fmtNumber(intercept + slope * day, 6)}%`, `${fmtNumber(yields[index] - (intercept + slope * day), 6)}%`]);
      return table("Echols-Elliot regression", "SUMMARY OUTPUT ve residual mantığı", ["Obs", "VKGS", "Yield", "Predicted Y", "Residual"], rows);
    },
  },
  "black-scholes": {
    inputs: [
      input("spot", "Spot Price (S)", "90"),
      input("strike", "Strike Price (K)", "110"),
      input("rate", "Risk Free Rate (r)", "5", "%"),
      input("time", "Time to Maturity (T)", "0.15", "yıl"),
      input("vol", "Actual Volatility (σ)", "18", "%"),
      input("optionType", "Option Type (Call or Put)", "Put", "", "select", "", null, ["Put", "Call"]),
    ],
    calc: (v) => {
      const option = bsPrice(cleanNumber(v.spot), cleanNumber(v.strike), rate(v.rate), cleanNumber(v.time), rate(v.vol), v.optionType);
      return [result("Black-Scholes Call Price", money(option.call)), result("Black-Scholes Put Price", money(option.put)), result("Seçili opsiyon fiyatı", money(option.price))];
    },
    detail: (v) => {
      const option = bsPrice(cleanNumber(v.spot), cleanNumber(v.strike), rate(v.rate), cleanNumber(v.time), rate(v.vol), v.optionType);
      return table("Black Scholes", "VBA bs_price fonksiyonunun JS karşılığı", ["Kalem", "Değer"], [
        ["Spot Price (S)", fmtNumber(cleanNumber(v.spot), 6)],
        ["Strike Price (K)", fmtNumber(cleanNumber(v.strike), 6)],
        ["Risk Free Rate (r)", pct(rate(v.rate))],
        ["Time to Maturity (T)", fmtNumber(cleanNumber(v.time), 6)],
        ["Actual Volatility (σ)", pct(rate(v.vol))],
        ["Option Type", v.optionType],
        ["d1", fmtNumber(option.d1, 8)],
        ["d2", fmtNumber(option.d2, 8)],
        ["Call Price", money(option.call)],
        ["Put Price", money(option.put)],
      ]);
    },
  },
});

modules.forEach((module) => {
  Object.assign(module, moduleOverrides[module.id] || {});
  if (!module.detail) {
    module.detail = (values) => table("Hesap özeti", "Nihai sonuç hücreleri", ["Sonuç", "Değer"], module.calc(values).map((item) => [item.label, item.value]));
  }
});

const byId = (id) => modules.find((item) => item.id === id) || modules[0];
const current = () => byId(state.activeId);

const currentValues = (module) => {
  const saved = state.drafts[module.id] || {};
  return Object.fromEntries(module.inputs.map((item) => [item.key, saved[item.key] ?? item.defaultValue]));
};

const activeResults = () => {
  try {
    return current().calc(currentValues(current()));
  } catch (error) {
    return [result("Sonuç", "Girişleri kontrol et")];
  }
};

const renderCategories = () => {
  const wrap = document.getElementById("category-pills");
  wrap.innerHTML = "";
  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = category === state.category ? "pill active" : "pill";
    button.textContent = category;
    button.addEventListener("click", () => {
      state.category = category;
      render();
    });
    wrap.appendChild(button);
  });
};

const renderModuleList = () => {
  const wrap = document.getElementById("module-list");
  const query = state.query.toLocaleLowerCase("tr-TR");
  const filtered = modules.filter((item) => {
    const categoryMatch = state.category === "Tümü" || item.category === state.category;
    const queryMatch =
      !query || `${item.title} ${item.category} ${item.description}`.toLocaleLowerCase("tr-TR").includes(query);
    return categoryMatch && queryMatch;
  });

  wrap.innerHTML = "";
  filtered.forEach((module) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = module.id === state.activeId ? "module-item active" : "module-item";
    button.innerHTML = `<span>${module.category}</span><strong>${module.title}</strong>`;
    button.addEventListener("click", () => {
      state.activeId = module.id;
      render();
    });
    wrap.appendChild(button);
  });
};
const renderListInput = (module, item, values) => {
  const field = document.createElement("div");
  field.className = "field wide list-field";

  const title = document.createElement("span");
  title.innerHTML = `${getEnhancedLabel(item, module)}${item.suffix ? `<em>${item.suffix}</em>` : ""}`;
  field.appendChild(title);

  const editor = document.createElement("div");
  editor.className = "list-editor";
  const entries = [];
  let addButton;

  const refreshIndexes = () => {
    entries.forEach((entry, index) => {
      entry.index.textContent = index + 1;
      entry.input.setAttribute("aria-label", `${getEnhancedLabel(item, module)} ${index + 1}`);
      entry.remove.hidden = entries.length <= 1;
    });
    if (item.limit && addButton) {
      if (entries.length >= item.limit) {
        addButton.style.display = "none";
      } else {
        addButton.style.display = "inline-block";
      }
    }
  };

  const syncList = () => {
    setDraftValue(module, item.key, joinListItems(entries.map((entry) => entry.input.value)));
    renderResultsOnly();
  };

  const addRow = (value = "", shouldFocus = false) => {
    const row = document.createElement("div");
    row.className = "list-row";

    const index = document.createElement("span");
    index.className = "list-index";

    const inputEl = document.createElement("input");
    inputEl.type = "text";
    inputEl.inputMode = "decimal";
    inputEl.value = value;
    inputEl.addEventListener("input", (event) => {
      const clean = event.target.value.replace(/[^0-9.,\-%\s]/g, "");
      if (clean !== event.target.value) {
        event.target.value = clean;
      }
      syncList();
    });
    inputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (!item.limit || entries.length < item.limit) {
          addRow("", true);
        }
      }
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "list-remove";
    remove.textContent = "Sil";
    remove.addEventListener("click", () => {
      const position = entries.findIndex((entry) => entry.row === row);
      if (position >= 0) entries.splice(position, 1);
      row.remove();
      if (!entries.length) addRow("");
      refreshIndexes();
      syncList();
    });

    row.appendChild(index);
    row.appendChild(inputEl);
    row.appendChild(remove);
    entries.push({ row, index, input: inputEl, remove });
    editor.appendChild(row);
    refreshIndexes();
    if (shouldFocus && inputEl.focus) inputEl.focus();
    return inputEl;
  };

  addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "list-add";
  addButton.textContent = "Değer ekle";
  addButton.addEventListener("click", () => {
    if (!item.limit || entries.length < item.limit) {
      addRow("", true);
    }
  });

  const initialItems = splitListItems(values[item.key]);
  (initialItems.length ? initialItems : [""]).slice(0, item.limit || 1000).forEach((value) => addRow(value));

  field.appendChild(editor);
  field.appendChild(addButton);

  const small = document.createElement("small");
  small.textContent = item.hint || "Her değeri ayrı kutuya yaz; Enter ile yeni değer ekleyebilirsin.";
  field.appendChild(small);

  // Initial refresh of add button visibility after rendering initial items
  refreshIndexes();

  return field;
};

const renderInputs = (module, values) => {
  const wrap = document.getElementById("input-grid");
  wrap.innerHTML = "";
  module.inputs.forEach((item) => {
    if (isListInput(item)) {
      wrap.appendChild(renderListInput(module, item, values));
      return;
    }

    const label = document.createElement("label");
    label.className = item.type === "text" ? "field wide" : "field";
    label.innerHTML = `<span>${getEnhancedLabel(item, module)}${item.suffix ? `<em>${item.suffix}</em>` : ""}</span>`;

    let control;
    if (item.type === "select") {
      control = document.createElement("select");
      const opts = item.options || [];
      opts.forEach((opt) => {
        const optionEl = document.createElement("option");
        optionEl.value = opt;
        optionEl.textContent = opt;
        control.appendChild(optionEl);
      });
      control.value = values[item.key];
    } else {
      control =
        item.type === "text"
          ? Object.assign(document.createElement("input"), { type: "text" })
          : Object.assign(document.createElement("input"), { inputMode: "decimal" });
      control.value = values[item.key];
    }

    control.addEventListener(item.type === "select" ? "change" : "input", (event) => {
      if (item.type !== "text" && item.type !== "select") {
        const clean = event.target.value.replace(/[^0-9.,\-%\s]/g, "");
        if (clean !== event.target.value) {
          event.target.value = clean;
        }
      }
      setDraftValue(module, item.key, event.target.value);
      renderResultsOnly();
    });
    label.appendChild(control);

    if (item.hint) {
      const small = document.createElement("small");
      small.textContent = item.hint;
      label.appendChild(small);
    }
    wrap.appendChild(label);
  });
};

const renderResultsOnly = () => {
  const module = current();
  const values = currentValues(module);
  const results = activeResults();
  const resultWrap = document.getElementById("result-stack");
  resultWrap.innerHTML = "";
  results.forEach((item) => {
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `<span>${getEnhancedLabel({ label: item.label }, module)}</span><strong>${item.value}</strong>`;
    resultWrap.appendChild(card);
  });
  renderDetail(module, values);
};

const renderDetail = (module, values) => {
  const panel = document.getElementById("detail-panel");
  const detail = typeof module.detail === "function" ? module.detail(values) : null;
  if (!detail || !detail.columns?.length || !detail.rows?.length) {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;
  document.getElementById("detail-title").textContent = detail.title || "Hesap tablosu";
  document.getElementById("detail-note").textContent = detail.note || "";

  const tableEl = document.getElementById("detail-table");
  const head = `<thead><tr>${detail.columns.map((column) => `<th>${column}</th>`).join("")}</tr></thead>`;
  const body = `<tbody>${detail.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell ?? ""}</td>`).join("")}</tr>`)
    .join("")}</tbody>`;
  tableEl.innerHTML = head + body;
};

const renderFormula = (module) => {
  const formulaWrap = document.getElementById("formula-stack");
  formulaWrap.innerHTML = "";
  module.formula.forEach((line) => {
    const code = document.createElement("code");
    code.textContent = line;
    formulaWrap.appendChild(code);
  });

  const variableWrap = document.getElementById("variable-list");
  variableWrap.innerHTML = "";
  module.variables.forEach((item) => {
    const row = document.createElement("div");
    row.innerHTML = `<strong>${item.symbol}</strong><span>${item.meaning}</span>`;
    variableWrap.appendChild(row);
  });
};

const renderActive = () => {
  const module = current();
  const values = currentValues(module);
  document.getElementById("active-category").textContent = module.category;
  document.getElementById("active-title").textContent = module.title;
  document.getElementById("active-description").textContent = module.description;
  document.getElementById("module-count").textContent = `${modules.findIndex((item) => item.id === module.id) + 1}/${modules.length}`;
  document.getElementById("insight-text").textContent = module.insight;
  renderInputs(module, values);
  renderResultsOnly();
  renderFormula(module);
};

const render = () => {
  renderCategories();
  renderModuleList();
  renderActive();
};

document.getElementById("search-input").addEventListener("input", (event) => {
  state.query = event.target.value;
  renderModuleList();
});

document.getElementById("export-excel-btn").addEventListener("click", async () => {
  const tableEl = document.getElementById("detail-table");
  if (!tableEl) return;

  const module = current();
  const title = module ? module.title : "Hesaplama";
  const fileName = `${title.replace(/\s+/g, "_")}_Hesap_Tablosu.xlsx`;

  // Create ExcelJS workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(title.substring(0, 31));

  // Get active values
  const values = currentValues(module);

  // 1. Write Parameters Section at the top
  const titleRow = worksheet.addRow([`${title} - Parametreler`]);
  titleRow.getCell(1).font = { name: "Inter", family: 4, size: 12, bold: true, color: { argb: "FF0A1F44" } };
  worksheet.mergeCells(`A${titleRow.number}:C${titleRow.number}`);

  module.inputs.forEach((inputItem) => {
    const rawVal = values[inputItem.key];
    let valStr = String(rawVal).trim();
    if (inputItem.suffix) {
      valStr = `${valStr} ${inputItem.suffix}`;
    }
    const paramLabel = getEnhancedLabel(inputItem, module);
    const paramRow = worksheet.addRow([paramLabel, valStr]);
    paramRow.getCell(1).font = { name: "Inter", family: 4, size: 10, bold: true, color: { argb: "FF5D6B82" } };
    paramRow.getCell(2).font = { name: "Inter", family: 4, size: 10, color: { argb: "FF0A1428" } };
    paramRow.getCell(2).alignment = { horizontal: "left" };
    worksheet.mergeCells(`B${paramRow.number}:C${paramRow.number}`);
  });

  // Spacer rows
  worksheet.addRow([]);
  const tableTitleRow = worksheet.addRow(["Hesaplama Detayları ve Tablosu"]);
  tableTitleRow.getCell(1).font = { name: "Inter", family: 4, size: 12, bold: true, color: { argb: "FF0A1F44" } };
  worksheet.mergeCells(`A${tableTitleRow.number}:C${tableTitleRow.number}`);
  worksheet.addRow([]);

  // 2. Parse HTML table and write rows
  const rows = Array.from(tableEl.querySelectorAll("tr"));
  
  rows.forEach((tr, rowIndex) => {
    const isHeader = tr.parentElement.tagName.toLowerCase() === "thead" || rowIndex === 0;
    const cells = Array.from(tr.querySelectorAll("th, td"));
    const rowValues = cells.map(cell => {
      const val = cell.textContent.trim();
      const cleaned = val.replace(/\./g, "").replace(",", ".").replace("TL", "").replace("%", "").replace(/\s/g, "");
      if (val && !isNaN(cleaned)) {
        let num = Number(cleaned);
        if (val.includes("%")) num = num / 100;
        return num;
      }
      return val;
    });

    const excelRow = worksheet.addRow(rowValues);

    // Apply styles to table cells
    cells.forEach((cell, colIndex) => {
      const excelCell = excelRow.getCell(colIndex + 1);
      const originalText = cell.textContent.trim();
      
      // Formatting styles
      if (originalText.includes("%")) {
        excelCell.numFmt = "0.00%";
      } else if (originalText.includes("TL")) {
        excelCell.numFmt = '#,##0.00" TL"';
      } else if (originalText && !isNaN(originalText.replace(/\./g, "").replace(",", "."))) {
        excelCell.numFmt = '#,##0.00';
      }

      // Font and alignment styles
      if (isHeader) {
        excelCell.font = { name: "Inter", family: 4, size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        excelCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF0A1F44" } // var(--navy)
        };
        excelCell.alignment = { horizontal: "center", vertical: "middle" };
      } else {
        excelCell.font = { name: "Inter", family: 4, size: 10, color: { argb: "FF0A1428" } };
        const isEven = rowIndex % 2 === 0;
        excelCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isEven ? "FFEEF6FF" : "FFF8FBFF" }
        };
        excelCell.alignment = { horizontal: isNaN(originalText.replace(/\./g, "").replace(",", ".")) ? "left" : "right", vertical: "middle" };
      }

      // Thin borders
      excelCell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } }
      };
    });
  });

  // Auto-fit columns based on length of contents
  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, cell => {
      let cellLength = 10;
      if (cell.value) {
        const text = String(cell.value);
        cellLength = text.length;
        if (text.includes("TL") || text.includes("%")) cellLength += 3;
      }
      if (cellLength > maxLength) {
        maxLength = cellLength;
      }
    });
    column.width = Math.max(12, Math.min(30, maxLength + 4));
  });

  // Write and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

render();
