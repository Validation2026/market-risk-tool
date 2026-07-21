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
    .split(/[;\n,]+/)
    .map(cleanNumber)
    .filter((item) => Number.isFinite(item));

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

const variables = (items) =>
  items.split("|").map((item) => {
    const [symbol, meaning] = item.split(":");
    return { symbol, meaning };
  });

const input = (key, label, defaultValue, suffix = "", type = "number", hint = "") => ({
  key,
  label,
  defaultValue,
  suffix,
  type,
  hint,
});

const result = (label, value) => ({ label, value });

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
    inputs: [input("initial", "Başlangıç çıkışı", "50000", "TL"), input("flows", "Nakit akışları", "15000; 18000; 22000; 26000", "", "text", "Değerleri noktalı virgül ile ayır: 1000; 1200; 900"), input("rate", "Dönemsel iskonto", "8", "%")],
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
    description: "Excel sayfasındaki gibi PV, FV ve gün sayısından basit, bileşik ve sürekli faiz oranlarını türetir.",
    formula: ["T = gün / 360", "Basit = (FV / PV - 1) / T", "Bileşik = (FV / PV)^(1 / T) - 1", "Sürekli = -LN(PV / FV) / T"],
    variables: variables("PV:Bugünkü değer|FV:Gelecek değer|T:Yıl cinsinden vade|LN:Doğal logaritma"),
    inputs: [input("present", "PV", "99.32"), input("future", "FV", "100"), input("days", "Gün", "14", "gün")],
    insight: "Bu modül faiz tipleri arasındaki dönüşümü gösterir; Excel IX sayfasındaki oran dönüşüm mantığıyla uyumludur.",
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
    description: "Excel sayfasındaki para piyasası iskonto yaklaşımıyla kuponsuz bononun PV değerini hesaplar.",
    formula: ["VKGS = Vade Tarihi - Portföy Tarihi", "PV = Nominal / (1 + VKGS x r / 365)", "r = (Nominal / PV - 1) x 365 / VKGS"],
    variables: variables("PV:Kuponsuz bono bugünkü değeri|VKGS:Vadeye kalan gün sayısı|r:Yıllık faiz oranı|Nominal:Vade sonunda ödenecek tutar"),
    inputs: [input("face", "Nominal", "100", "TL"), input("days", "Vadeye kalan gün sayısı", "364", "gün"), input("yield", "Faiz oranı", "8.63", "%"), input("marketPrice", "Piyasa fiyatı", "92.06", "TL")],
    insight: "Excel X sayfası bileşik vade yerine gün sayısı bazlı basit iskonto kullanır; bu modül aynı mantıkla çalışır.",
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
    inputs: [input("flows", "Nakit akışları", "10000; -3000; 15000; 18000", "", "text", "Değerleri noktalı virgül ile ayır."), input("rate", "Dönemsel iskonto", "4", "%")],
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
    description: "Excel XIV sayfasındaki FRA mantığıyla sabit ödeme, değişken forward ödeme ve bugünkü kontrat değerini hesaplar.",
    formula: ["f = ((1 + r2)^T2 / (1 + r1)^T1) - 1", "τ = T2 - T1", "P = N x (f - K) x τ x e^(-r_d x T2)"],
    variables: variables("N:Nominal tutar|K:Sabit ödeme oranı|r1, r2:İlgili vadelerdeki spot/LIBOR oranları|τ:Sözleşme dönemi uzunluğu"),
    inputs: [input("notional", "Nominal", "1000000", "TL"), input("fixed", "Sabit Ödeme", "8.5", "%"), input("r1", "r1", "8.434", "%"), input("t1", "T1", "1", "yıl"), input("r2", "r2", "8.8", "%"), input("t2", "T2", "2", "yıl"), input("discount", "r2 iskonto", "0", "%")],
    insight: "Bu sürüm kur forwardı değil, Excel'deki forward rate sözleşmesi yani faiz forwardı mantığıyla çalışır.",
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
    description: "Excel XVII sayfasındaki gibi rating bazlı faiz farkını gün sayılı kuponsuz bono fiyatına yansıtır.",
    formula: ["PV = Nominal / (1 + VKGS x r / 365)", "Spread Etkisi = PV_düşük_getiri / PV_yüksek_getiri - 1"],
    variables: variables("PV:Bugünkü değer|VKGS:Vadeye kalan gün sayısı|r:Ratinge göre kullanılan yıllık faiz|Nominal:Vade sonu ödeme"),
    inputs: [input("face", "Nominal", "100", "TL"), input("days", "Vadeye kalan gün sayısı", "365", "gün"), input("yieldA", "Industrial A Verim", "0.376", "%"), input("yieldBBB", "Industrial BBB- Verim", "1.022", "%")],
    insight: "Bu modül bileşik yıllık iskonto yerine Excel'deki gün sayılı kuponsuz şirket bonosu formülünü kullanır.",
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
    inputs: [input("portfolio", "Portföy değeri", "10000000", "TL"), input("returns", "Tarihsel getiriler", "-0.8; 0.4; -1.2; 0.6; -2.1; 1.0; -0.3; -1.6; 0.2; -0.9", "", "text", "Getirileri yüzde olarak gir: -1.2; 0.4; -0.8"), input("confidence", "Güven düzeyi", "99", "%")],
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
    description: "Excel XXXIII sayfasındaki gibi aktif/pasif tutarları, durasyonları ve faiz şoku üzerinden durasyon gap etkisini hesaplar.",
    formula: ["Durasyon GAP = D_A - D_L x (L / A)", "Asset Etki = -A x D_A x Δr", "Liability Etki = -L x D_L x Δr", "Toplam = Asset Etki - Liability Etki"],
    variables: variables("A:Asset tutarı|L:Liability tutarı|D_A:Asset durasyonu|D_L:Liability durasyonu|Δr:Faiz şoku"),
    inputs: [input("asset", "Asset Tutar", "1000"), input("liability", "Liability Tutar", "900"), input("assetDuration", "Asset Durasyon", "3"), input("liabilityDuration", "Liability Durasyon", "0.5"), input("equity", "Özkaynak", "100"), input("shock", "Şok", "1", "%")],
    insight: "Makro hedge burada hedge adedi değil, Excel'deki gibi bilanço düzeyinde durasyon uyumsuzluğu ve faiz şoku etkisini gösterir.",
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

const renderInputs = (module, values) => {
  const wrap = document.getElementById("input-grid");
  wrap.innerHTML = "";
  module.inputs.forEach((item) => {
    const label = document.createElement("label");
    label.className = item.type === "text" ? "field wide" : "field";
    label.innerHTML = `<span>${item.label}${item.suffix ? `<em>${item.suffix}</em>` : ""}</span>`;

    const control =
      item.type === "text"
        ? Object.assign(document.createElement("textarea"), { rows: 3 })
        : Object.assign(document.createElement("input"), { inputMode: "decimal" });

    control.value = values[item.key];
    control.addEventListener("input", (event) => {
      state.drafts[module.id] = { ...(state.drafts[module.id] || {}), [item.key]: event.target.value };
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
  const results = activeResults();
  const resultWrap = document.getElementById("result-stack");
  resultWrap.innerHTML = "";
  results.forEach((item) => {
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
    resultWrap.appendChild(card);
  });
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

render();
