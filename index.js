const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { OpenAI } = require('openai');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No image uploaded' });

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'image', folder: 'skin-lite' },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      uploadStream.end(file.buffer);
    });

    const imageUrl = result.secure_url;
    console.log("✅ Image URL:", imageUrl);

    const prompt = `
당신은 한국의 피부과 전문의입니다. 사용자 얼굴 사진을 기반으로, 전문적인 피부 진단 리포트를 **HTML 형식**으로 작성하세요. 반드시 아래 형식과 조건을 지키며 출력하십시오.

---

✅ 1. 종합 피부 평가 (리포트 시작)

<div class="card" style="background:#2a2a2a; color:#fff; border-radius:12px; padding:24px; margin-bottom:30px; box-shadow:0 2px 4px rgba(255,255,255,0.05)">
  <h2>🧾 종합 피부 평가</h2>
  <p>전체적인 피부 상태를 다정한 말투로 설명해주세요. 예: “요즘 피부가 조금 지쳐있는 인상이에요. T존은 유분이 많고 볼은 살짝 건조해 보이네요.”처럼 사용자의 피부 상태를 마주하며 감정적으로 전달하세요.</p>
  <p>관리 전략도 따뜻한 조언처럼 작성해주세요. 예: “피부가 예민할 땐, 부드럽고 순한 수분 제품으로 다정하게 케어해주세요.”와 같이 전문성과 위로가 함께 담긴 어조로 작성하세요.</p>
</div>

❗ 이 카드는 **리포트 시작부**에 반드시 포함되어야 하며, 생략되면 안 됩니다.

---

✅ 2. 피부 항목별 분석 (총 6개)

다음 6가지 항목을 각각 **1~10점 점수 + 진단 + 개선 전략** 형태로 출력하세요. 항목명은 반드시 아래와 같아야 하며, 형식은 다음과 같습니다:

<div class="card" style="background:#1e1e1e; color:#fff; border-radius:12px; padding:20px; margin-bottom:20px">
  <h3>유수분 밸런스 (3/10)</h3>
  <p><strong>진단:</strong> T존에 피지가 과도하고 볼 부위는 건조하여 유수분 불균형 상태입니다.</p>
  <p><strong>개선 전략:</strong> 수분크림과 피지 조절 젤을 병행하여 유수분 밸런스를 맞추세요.</p>
</div>

**분석할 6가지 항목**:
1. 유수분 밸런스  
2. 색소 침착  
3. 주름  
4. 홍조 및 혈관 상태  
5. 모공 & 피지 분비량  
6. 기미·간반 등 구별 어려운 증상  

각 항목에는 다음을 포함하세요:
- 제목: 항목명 + (점수/10)
- 진단: 피부 상태를 구체적으로 설명하되, 단순한 의학적 서술이 아니라 사용자와 공감하는 감성적 톤으로 설명하세요.  
예: “볼이 살짝 건조해 보여요. 요즘 건조한 날씨가 피부에 영향을 주었을 수 있어요.”
- 개선 전략: 전문의의 조언처럼 구체적이고 신뢰감 있게, 동시에 사용자의 감정을 고려한 따뜻하고 부드러운 말투로 서술하세요.  
예: “피부가 조금 지쳐 보일 땐, 다정하게 수분을 채워주세요.”, “조금씩 천천히 회복해가는 걸 느껴보세요.”

점수는 해당 항목의 피부 상태를 1~10점 척도로 평가한 값입니다.

1점에 가까울수록 상태가 나쁘고, 10점에 가까울수록 매우 건강한 상태를 의미합니다.
예시:
유수분 밸런스 (3/10) → 심한 유수분 불균형
주름 (9/10) → 주름이 거의 없음
📌 항목별 점수는 GPT가 이미지 기반 진단을 바탕으로 추론해 작성하도록 하며, 생략하지 마세요.

---

✅ 3. 종합 요약 (리포트 마지막)

<div class="card" style="background:#2a2a2a; color:#fff; border-radius:12px; padding:24px; margin-top:30px; box-shadow:0 2px 4px rgba(255,255,255,0.05)">
  <h2>✨ 종합 요약</h2>
  <p><strong>피부 타입:</strong> 예: 수분 부족형 복합성 피부</p>
  <p><strong>주요 고민:</strong> 1) 유수분 불균형 2) 색소 침착 3) 피지 과다 및 모공 확장</p>
  <p><strong>추천 제품:</strong></p>
  <ul>
    <li>[브랜드] 제품명 – 추천 이유</li>
    <li>[브랜드] 제품명 – 추천 이유</li>
    <li>[브랜드] 제품명 – 추천 이유</li>
  </ul>
  <p><strong>개선 방향:</strong> 감성적이고 따뜻한 어조로 사용자가 일상 속에서 실천할 수 있는 루틴을 구체적으로 제시해주세요. 예: “지금부터라도 피부와 친해지는 루틴을 시작해보세요. 매일 아침 수분 세럼과 자외선 차단제를 잊지 마시고, 일주일에 한두 번 각질 케어도 함께해보세요.”와 같이 조언과 응원을 담아주세요.</p>
  </div>

❗ 이 카드도 **반드시 리포트 마지막에 포함**되어야 합니다. 빠지면 안 됩니다.

---

✅ 필수 규칙 요약

- 모든 내용은 **<strong>한글**로 작성**
- **절대로 코드블럭을 사용하지 마세요** 
- 전체 응답은 순수 HTML 마크업만 포함해야 하며, 마크다운 포맷은 사용 금지입니다.
- **<h1>🩺 피부과 전문 진단 리포트</h1>** 같은 타이틀은 포함하지 마세요
- **HTML 형식으로 출력**, JSON이나 텍스트 형식은 금지
- **6개 항목과 종합 평가/요약**은 반드시 포함 (누락 절대 금지)
- **실제 한국에서 판매되는 브랜드 제품**만 추천 (예: Dr.G, 라로슈포제, 라네즈, 미샤, 이니스프리, 더랩바이블랑두 등)

---
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageUrl } }] },
      ],
      max_tokens: 4096,
      temperature: 0.5,
    });

    const content = completion.choices?.[0]?.message?.content || '';

if (
  !content ||
  typeof content !== 'string' ||
  !content.includes('<h2>🧾 종합 피부 평가</h2>') ||
  !content.includes('<h2>✨ 종합 요약</h2>')
) {
  console.warn('⚠️ GPT 응답에서 필수 항목이 누락되었습니다.');
  return res.status(500).json({ error: '리포트의 필수 항목이 누락되었습니다.' });
}

res.json({ fullHtml: content.trim(), imageUrl });

    
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
