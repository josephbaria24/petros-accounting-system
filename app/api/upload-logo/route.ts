//app\api\upload-logo\route.ts
import { NextRequest, NextResponse } from "next/server";
import { IncomingForm, Files, Fields } from "formidable";
import { Readable } from "stream";
import * as ftp from "basic-ftp";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

function toNodeRequest(req: NextRequest): any {
  const readable = new Readable({ read() {} });
  req
    .arrayBuffer()
    .then((buffer) => {
      readable.push(Buffer.from(buffer));
      readable.push(null);
    })
    .catch((err) => readable.destroy(err));
  (readable as any).headers = Object.fromEntries(req.headers);
  (readable as any).method = req.method;
  (readable as any).url = req.url;
  return readable;
}

export async function POST(req: NextRequest) {
  return new Promise<NextResponse>((resolve) => {
    const form = new IncomingForm({ multiples: false });
    const nodeReq = toNodeRequest(req);

    form.parse(nodeReq, async (err: any, fields: Fields, files: Files) => {
      if (err) {
        console.error("Form parse error:", err);
        resolve(NextResponse.json({ error: err.message }, { status: 500 }));
        return;
      }

      const logoFile = Array.isArray(files.logo)
        ? files.logo[0]
        : (files.logo as any);

      if (!logoFile) {
        resolve(
          NextResponse.json({ error: "No file uploaded" }, { status: 400 })
        );
        return;
      }

      // Validate image file
      const validExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
      const extension = logoFile.originalFilename
        ?.split(".")
        ?.pop()
        ?.toLowerCase();

      if (!extension || !validExtensions.includes(extension)) {
        resolve(
          NextResponse.json(
            { error: "Invalid file type. Use JPG, PNG, GIF, or WebP" },
            { status: 400 }
          )
        );
        return;
      }

      const client = new ftp.Client();
      client.ftp.verbose = true;

      try {
        await client.access({
          host: process.env.HOSTINGER_SFTP_HOST!,
          user: process.env.HOSTINGER_SFTP_USER!,
          password: process.env.HOSTINGER_SFTP_PASS!,
          port: 21,
          secure: false,
        });

        const newFileName = `logo_${randomUUID()}.${extension}`;

        try {
          await client.ensureDir("company_logos");
          console.log("Company logos directory ensured");
        } catch (dirError) {
          console.log("Could not ensure company_logos directory, uploading to root");
        }

        let uploadPath = `company_logos/${newFileName}`;
        let publicUrl = `https://petrosphere.com.ph/uploads/trainees/company_logos/${newFileName}`;

        try {
          await client.uploadFrom(logoFile.filepath, uploadPath);
          console.log(`Uploaded to ${uploadPath}`);
        } catch (uploadError) {
          console.log("Failed to upload to company_logos folder, trying root directory");
          uploadPath = `company_logos_${newFileName}`;
          publicUrl = `https://petrosphere.com.ph/uploads/trainees/company_logos_${newFileName}`;
          await client.uploadFrom(logoFile.filepath, uploadPath);
          console.log(`Uploaded to root as ${uploadPath}`);
        }

        client.close();

        resolve(
          NextResponse.json(
            {
              url: publicUrl,
              filename: logoFile.originalFilename || newFileName,
            },
            { status: 200 }
          )
        );
      } catch (uploadErr: any) {
        console.error("FTP upload error:", uploadErr);
        resolve(
          NextResponse.json({ error: uploadErr.message }, { status: 500 })
        );
      }
    });
  });
}
