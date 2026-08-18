const express = require('express');
const router = express.Router();
const Tutor = require('../schemas/tutorSchema');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// In-memory or database configuration fallback if no key is present
const getFallbackResponse = (message, approvedTutors) => {
  const msg = message.toLowerCase();

  // 1. Math tutors
  if (msg.includes('math')) {
    const mathTutors = approvedTutors.filter(t => 
      t.subjects.some(sub => sub.toLowerCase().includes('math'))
    );
    if (mathTutors.length > 0) {
      return `We have several excellent Mathematics tutors: ${mathTutors.map(t => `${t.name} (₹${t.hourlyRate}/hr)`).join(', ')}. You can find and book a free demo with them on our "Browse Tutors" page!`;
    }
    return "We currently don't have active Math tutors listed, but please check our 'Browse Tutors' page for the latest updates.";
  }

  // 2. Science/Physics/Chemistry tutors
  if (msg.includes('science') || msg.includes('physics') || msg.includes('chemistry') || msg.includes('biology')) {
    const sciTutors = approvedTutors.filter(t => 
      t.subjects.some(sub => 
        sub.toLowerCase().includes('science') || 
        sub.toLowerCase().includes('physic') || 
        sub.toLowerCase().includes('chem') || 
        sub.toLowerCase().includes('biol')
      )
    );
    if (sciTutors.length > 0) {
      return `Here are some of our Science tutors: ${sciTutors.map(t => `${t.name} (₹${t.hourlyRate}/hr)`).join(', ')}. You can book a free demo with them on our "Browse Tutors" page!`;
    }
    return "Please check our 'Browse Tutors' page to see all available Science tutors.";
  }

  // 3. AI / Coding
  if (/\bai\b/i.test(msg) || msg.includes('coding') || msg.includes('future skills') || msg.includes('course')) {
    return "Our 'AI Future Skills' program is a cohort-based program that teaches coding and AI skills to school students. The registration fee for the assessment exam is ₹100. Let me know if you would like more details or if you'd like to sign up!";
  }

  // 4. How to book
  if (msg.includes('book') || msg.includes('demo') || msg.includes('class')) {
    return "To book a class or free demo, simply click 'Browse Tutors' in the navigation bar, choose a tutor, and select an available time slot. If you are a new student, you will need to register a free account first!";
  }

  // 5. Default contact / help
  return "Hello! I am the Cuvasol Assistant. I can help you find tutors (e.g., Math or Science) or answer questions about our classes. Please let me know how I can assist you!";
};

router.post('/', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages history array is required.' });
  }

  const lastUserMessage = messages[messages.length - 1].text;

  try {
    // 1. Fetch approved tutors dynamically from the database
    const approvedTutors = await Tutor.find({ status: 'approved' })
      .select('name subjects hourlyRate city mode experience rating');

    // 2. Format tutor summary for LLM context
    const tutorSummary = approvedTutors.map((t, idx) => {
      return `${idx + 1}. Name: ${t.name}, Subjects: [${t.subjects.join(', ')}], Rate: ₹${t.hourlyRate}/hr, City: ${t.city || 'Any'}, Mode: ${t.mode}, Exp: ${t.experience} years, Rating: ${t.rating || 0}/5`;
    }).join('\n');

    // 3. Check for Gemini API key
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('YOUR_API_KEY')) {
      console.warn('[Chatbot] GEMINI_API_KEY is not configured. Using local rule-based fallback.');
      const fallbackText = getFallbackResponse(lastUserMessage, approvedTutors);
      return res.json({ response: fallbackText });
    }

    // 4. Build system prompt instruction
    const systemInstruction = `You are the official Cuvasol Support Assistant. Cuvasol is a premium tutor booking platform.
Your main job is to answer user inquiries about Cuvasol and recommend matching tutors from the provided list.

--- CUVSOL WEBSITE INFORMATION ---
- Cuvasol provides personalized tutoring classes for school students.
- Features a special "AI Future Skills" program (a cohort-based program teaching AI & coding skills to build future-ready students).
- Registration fee for the AI Future Skills Program Assessment is ₹100.
- Booking a demo session with any tutor is free.
- The company is based in Bangalore, Karnataka (Office: WeWork Old Madras Road, Bangalore 560016).
- Contact Support email is support@cuvasol.com.

--- CURRENT APPROVED TUTORS LIST ---
${tutorSummary}

--- STRICT BEHAVIOR RULES ---
1. You MUST ONLY answer questions related to Cuvasol, its courses, booking process, policies, and tutor recommendations.
2. DO NOT write code, solve math equations, answer general knowledge, or do homework. If a user asks anything outside of Cuvasol support (e.g. "Solve x^2+2x=0" or "Write a python script"), politely say: "I am only authorized to assist with Cuvasol-related questions, bookings, and tutor recommendations. I cannot help with homework or general-purpose tasks."
3. When recommending tutors, list their names, subjects, hourly rates, and politely tell the user they can search for them on the "Browse Tutors" page to book a free demo.
4. Keep all responses very concise, clear, and friendly.
5. If the user asks a question you do not know the answer to, guide them to email support@cuvasol.com.`;

    // 5. Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3.5-flash-lite',
      systemInstruction: systemInstruction 
    });

    // 6. Map chat history (Gemini SDK expects specific role and parts format)
    // Gemini SDK expects history roles to be: 'user' and 'model'
    const sdkHistory = messages.slice(0, -1).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // Start chat session
    const chat = model.startChat({
      history: sdkHistory,
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0.3
      }
    });

    const result = await chat.sendMessage(lastUserMessage);
    const responseText = result.response.text();

    res.json({ response: responseText });

  } catch (error) {
    console.error('[Chatbot Error]:', error);
    // Graceful fallback response on error so the widget remains functional
    try {
      const approvedTutors = await Tutor.find({ status: 'approved' }).select('name subjects hourlyRate');
      const fallbackText = getFallbackResponse(lastUserMessage, approvedTutors);
      return res.json({ response: fallbackText });
    } catch (dbErr) {
      res.json({ response: "Hello! I am having trouble connecting right now, but you can browse our active tutors on the 'Browse Tutors' page or email us at support@cuvasol.com!" });
    }
  }
});

module.exports = router;
