const { S3Client, ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

module.exports = { s3, S3_BUCKET: "preethisamplebucket", ListObjectsV2Command, GetObjectCommand };


// console.log("Access Key:", process.env.AWS_ACCESS_KEY_ID);
// console.log("Secret Key:", process.env.AWS_SECRET_ACCESS_KEY);


