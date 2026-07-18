import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COMMENT_TEMPLATES: Record<string, string[]> = {
  positive: [
    "Əla paylaşımdır! 👏",
    "Çox gözəl! 🔥",
    "Bu məni çox sevindirdi! ❤️",
    "Super! Davam et belə! 💪",
    "İnandırıcı deyil! 😍",
    "Mükəmməldir! ✨",
    "Bu gözəl anı paylaşdığın üçün təşəkkürlər!",
    "Çox xoş oldu! 🙌",
  ],
  question: [
    "Bu nə qədər maraqlıdır! Daha çox məlumat verə bilərsən?",
    "Harada çəkilib bu?",
    "Necə etmisən bunu?",
    "Bu barədə daha çox danışa bilərsən?",
    "Bu mənim də marağımı çəkir!",
  ],
  supportive: [
    "Dəstəkləyirəm! 💯",
    "Səninlə tam razıyam!",
    "Davam et, əla gedir! 🚀",
    "Bu çox doğru sözlərdir!",
    "Əlinə sağ ol! 👋",
  ],
  funny: [
    "Hahaha, bu günümü işlətdi! 😂",
    "Çox gülməli! 🤣",
    "Məni güldürdün! 😄",
    "Bu qədər gülməli olacağını gözləmirdim!",
  ],
  aesthetic: [
    "Gözəl kadrdır! 📸",
    "Rənglər mükəmməldir! 🎨",
    "Gözəl kompozisiya! ✨",
    "Bu şəkil bir incisənər! 🖼️",
    "Çox estetik görünür!",
  ],
};

function analyzeContent(content: string): string[] {
  const lower = content.toLowerCase();
  const categories: string[] = [];

  const positiveWords = ['sevindim', 'xoşbəxt', 'gözəl', 'əla', 'super', 'mükəmməl', 'əla', 'başardım', 'təşəkkür', 'sevirəm', 'bəyəndim'];
  const questionWords = ['necə', 'harada', 'niyə', 'nə vaxt', 'kimdir', 'bilirsiniz', 'sual'];
  const supportWords = ['dəstək', 'sən', 'bacararsan', 'inana', 'davam', 'mübarizə'];
  const funnyWords = ['gül', 'gülü', 'zarafat', 'əl', 'maraqlı', 'qəribə'];
  const aestheticWords = ['şəkil', 'gözəl', 'rəng', 'manzara', 'portret', 'selfie', 'səhnə', 'təbiət'];

  if (positiveWords.some(w => lower.includes(w))) categories.push('positive');
  if (questionWords.some(w => lower.includes(w))) categories.push('question');
  if (supportWords.some(w => lower.includes(w))) categories.push('supportive');
  if (funnyWords.some(w => lower.includes(w))) categories.push('funny');
  if (aestheticWords.some(w => lower.includes(w))) categories.push('aesthetic');

  if (lower.includes('?')) categories.push('question');

  if (categories.length === 0) categories.push('positive', 'supportive');

  return categories;
}

function generateSuggestions(content: string): string[] {
  const categories = analyzeContent(content);
  const suggestions: string[] = [];

  for (const cat of categories) {
    const templates = COMMENT_TEMPLATES[cat] || [];
    const shuffled = templates.sort(() => Math.random() - 0.5);
    suggestions.push(...shuffled.slice(0, 2));
  }

  const unique = [...new Set(suggestions)];
  return unique.slice(0, 5);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { post_content, post_id, user_id } = await req.json();

    const suggestions = generateSuggestions(post_content || "");

    return new Response(
      JSON.stringify({ suggestions }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
