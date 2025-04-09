const fs = require("fs").promises;
const path = require("path");
const { s3, S3_BUCKET, ListObjectsV2Command, GetObjectCommand } = require("../config/aws-config");
const { Readable } = require("stream");

async function streamToString(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

async function pullRepo() {
    const repoPath = path.resolve(process.cwd(), ".myGit");
    const commitsPath = path.join(repoPath, "commits");

    try {
        const data = await s3.send(
            new ListObjectsV2Command({
                Bucket: S3_BUCKET,
                Prefix: "commits/",
            })
        );
        
        const objects = data.Contents || []; // ✅ Add fallback empty array
        
        for (const object of objects) {
            if (!object.Key.endsWith("/")) { // ✅ Skip folder keys
                const key = object.Key;
                const commitId = path.dirname(key).split("/").pop();
                const commitDir = path.join(commitsPath, commitId);
                await fs.mkdir(commitDir, { recursive: true });
        
                const response = await s3.send(
                    new GetObjectCommand({
                        Bucket: S3_BUCKET,
                        Key: key,
                    })
                );
        
                const fileContent = await streamToString(response.Body);
                await fs.writeFile(
                    path.join(commitDir, path.basename(key)),
                    fileContent
                );
            }
        }
        
        console.log("All commits pulled from S3.");
    } catch (err) {
        console.error("Unable to pull:", err.message);
    }
}

module.exports = { pullRepo };
