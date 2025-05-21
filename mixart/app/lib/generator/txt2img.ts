const IMAGE_GENERATION_API_URL_V2 = process.env.IMAGE_GENERATION_API_URL_V2!;
const WEBHOOK_URL = process.env.WEBHOOK_URL!;
const IMAGE_API_KEY = process.env.IMAGE_API_KEY!;

export interface TextFormFields {
  image?: Buffer;
  mask?: Buffer;
  facelock?: Buffer;
  pose?: Buffer;
  params: string;
  type_gen: string;
  type_user: string;
  id_gen: string;
}

export async function submitTextForm(fields: TextFormFields): Promise<any> {
    const form = new FormData();

    form.append('api_key', IMAGE_API_KEY);

    if (fields.image) {
        const imageBlob = new Blob([fields.image], { type: 'application/octet-stream' });
        form.append('image', imageBlob, 'image.png');
    }

    if (fields.mask) {
        const maskBlob = new Blob([fields.mask], { type: 'application/octet-stream' });
        form.append('mask', maskBlob, 'mask.png');
    }

    if (fields.facelock) {
        const facelockBlob = new Blob([fields.facelock], { type: 'application/octet-stream' });
        form.append('facelock', facelockBlob, 'facelock.png');
    }

    if (fields.pose) {
        const poseBlob = new Blob([fields.pose], { type: 'application/octet-stream' });
        form.append('pose', poseBlob, 'pose.png');
    }

    form.append('params', fields.params);
    form.append('type_gen', fields.type_gen);
    form.append('type_user', fields.type_user);
    form.append('id_gen', fields.id_gen);
    form.append('webhook', WEBHOOK_URL);

    console.log('form', form)

    try {
        const response = await fetch(IMAGE_GENERATION_API_URL_V2, {
            method: 'POST',
            body: form,
            headers: {
                'api_key': IMAGE_API_KEY,
            },
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Server responded with ${response.status}: ${err}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error submitting image form:', error);
        throw error;
    }
}