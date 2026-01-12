//app\api\upload-customer-attachment\route.ts
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

// Helper: convert NextRequest -> Node-style Readable with headers
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

      const attachmentFile = Array.isArray(files.attachment)
        ? files.attachment[0]
        : (files.attachment as any);

      if (!attachmentFile) {
        resolve(
          NextResponse.json({ error: "No file uploaded" }, { status: 400 })
        );
        return;
      }

      const client = new ftp.Client();
      client.ftp.verbose = true;

      try {
        // Connect using your FTP credentials
        await client.access({
          host: process.env.HOSTINGER_SFTP_HOST!,
          user: process.env.HOSTINGER_SFTP_USER!,
          password: process.env.HOSTINGER_SFTP_PASS!,
          port: 21,
          secure: false,
        });

        // Generate unique filename for attachment
        const extension = attachmentFile.originalFilename
          ?.split(".")
          ?.pop()
          ?.toLowerCase();
        const newFileName = `customer_attachment_${randomUUID()}.${extension}`;

        // Try to create customer_attachments directory if it doesn't exist
        try {
          await client.ensureDir("customer_attachments");
          console.log("Customer attachments directory ensured");
        } catch (dirError) {
          console.log("Could not ensure customer_attachments directory, uploading to root");
        }

        // Try to upload to customer_attachments folder first, fallback to root if fails
        let uploadPath = `customer_attachments/${newFileName}`;
        let publicUrl = `https://petrosphere.com.ph/uploads/trainees/customer_attachments/${newFileName}`;

        try {
          await client.uploadFrom(attachmentFile.filepath, uploadPath);
          console.log(`Uploaded to ${uploadPath}`);
        } catch (uploadError) {
          console.log("Failed to upload to customer_attachments folder, trying root directory");
          // Fallback: upload to root with customer_attachments_ prefix
          uploadPath = `customer_attachments_${newFileName}`;
          publicUrl = `https://petrosphere.com.ph/uploads/trainees/customer_attachments/customer_attachments_${newFileName}`;
          await client.uploadFrom(attachmentFile.filepath, uploadPath);
          console.log(`Uploaded to root as ${uploadPath}`);
        }

        client.close();

        resolve(
          NextResponse.json(
            { 
              url: publicUrl,
              filename: attachmentFile.originalFilename || newFileName
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