import { NextRequest, NextResponse } from 'next/server';
import { submitTextForm, TextFormFields } from '@/app/lib/generator/txt2img';
import { connectMongoDB } from '@/app/lib/mongodb/mongodb';

export async function POST(req: NextRequest) {
  try {
    await connectMongoDB();

    const formData = await req.formData();

    const image = formData.get('image');
    const mask = formData.get('mask');
    const facelock = formData.get('facelock');
    const pose = formData.get('pose');

    const params = formData.get('params') as string;
    const type_gen = formData.get('type_gen') as string;
    const type_user = formData.get('type_user') as string;
    const id_gen = formData.get('id_gen') as string;

    const parsedParams = JSON.parse(params);
    if (parsedParams.weights_interpretator === 'Lite') {
      parsedParams.weights_interpretator = 'A1111';
    } else if (parsedParams.weights_interpretator === 'Pro') {
      parsedParams.weights_interpretator = 'comfy';
    }
    const updatedParams = JSON.stringify(parsedParams);

    // Helper to convert File to Buffer
    const fileToBuffer = async (file: unknown): Promise<Buffer | undefined> => {
      if (file instanceof Blob && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    };

    const fields: TextFormFields = {
      image: await fileToBuffer(image),
      mask: await fileToBuffer(mask),
      facelock: await fileToBuffer(facelock),
      pose: await fileToBuffer(pose),
      params: updatedParams,
      type_gen,
      type_user,
      id_gen,
    };

    const response = await submitTextForm(fields);

    return NextResponse.json(
      { message: 'Text processed successfully', ProcessingResponse: response },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing text:', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
