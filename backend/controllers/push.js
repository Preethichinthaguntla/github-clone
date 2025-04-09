const fs = require("fs").promises;
const path = require("path");
const { s3, S3_BUCKET } = require("../config/aws-config");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

async function pushRepo() {
    const repoPath = path.resolve(process.cwd(), ".myGit");
    const commitsPath = path.join(repoPath, "commits");

    try {
        const commitDirs = await fs.readdir(commitsPath);
        for (const commitDir of commitDirs) {
            const commitPath = path.join(commitsPath, commitDir);
            const files = await fs.readdir(commitPath);

            for (const file of files) {
                const filePath = path.join(commitPath, file);
                const fileContent = await fs.readFile(filePath);
                const params = {
                    Bucket: S3_BUCKET,
                    Key: `commit/${commitDir}/${file}`,
                    Body: fileContent,
                };

                await s3.send(new PutObjectCommand(params));
            }
        }

        console.log("✅ All commits pushed to S3.");

    } catch (err) {
        console.error("❌ Error pushing to S3:", err);
    }
}

module.exports = { pushRepo };
