import { NextResponse, NextRequest } from "next/server";
import { submitUpscaleForm, UpscaleFormFields } from "@/app/lib/generator/img2upscale";
import { Blob } from 'buffer';

export async function POST(req: NextRequest) {
    try {
        
        const formData = await req.formData();

        const image = formData.get('image');

        const params = formData.get('params') as string;
        const type_gen = formData.get('type_gen') as string;
        const type_user = formData.get('type_user') as string;
        const id_gen = formData.get('id_gen') as string;

        // Helper to convert File to Buffer
        const fileToBuffer = async (file: unknown): Promise<Buffer | undefined> => {
            if (file instanceof Blob && file.size > 0) {
            const arrayBuffer = await file.arrayBuffer();
            return Buffer.from(arrayBuffer);
            }
        };

        const fields: UpscaleFormFields = {
            image: await fileToBuffer(image),
            params,
            type_gen,
            type_user,
            id_gen,
        };

        // console.log("text-instant fields:", fields)
        const response = await submitUpscaleForm(fields);
        // console.log('response API IMAGE', response);
        return NextResponse.json({ message: 'Image processed successfully', ProcessingResponse: response }, { status: 200 });
    } catch (error) {
        console.error('Error processing text:', error);
        let errorMessage = 'An error occurred';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json({ message: errorMessage }, { status: 500 });
    }
}