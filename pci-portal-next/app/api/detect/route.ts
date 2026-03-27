import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const { image } = await req.json(); // base64 image string

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Identify the plastic type in this image. Return ONLY a JSON object with: { "plastic_type": "PET" | "HDPE" | "LDPE" | "MLP" | "Unknown", "recyclable": boolean, "confidence": number between 0 and 1, "description": string }. Be accurate.'
            },
            {
              type: 'image_url',
              image_url: {
                url: image
              }
            }
          ]
        }
      ],
      model: 'llama-3.2-11b-vision-preview',
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('Groq detection error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
