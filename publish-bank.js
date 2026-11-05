// /api/publish-bank.js
export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { filename, code, repoOwner, repoName } = req.body;
    
    // Securely pull the token from Vercel Environment Variables
    const githubToken = process.env.GITHUB_TOKEN; 

    if (!githubToken || !repoOwner || !repoName || !filename || !code) {
        return res.status(400).json({ error: 'Missing required fields or GitHub configuration' });
    }

    // Ensure the file is saved in the question-banks folder
    const path = `question-banks/${filename}`;
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`;

    try {
        // 1. Check if the file already exists to get its SHA (Required for updating)
        let sha = null;
        const checkRes = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        // If the file exists, grab the SHA hash
        if (checkRes.ok) {
            const fileData = await checkRes.json();
            sha = fileData.sha;
        } else if (checkRes.status !== 404) {
            // If it's not a 404 (file not found), then something else went wrong
            const errData = await checkRes.json();
            throw new Error(`GitHub Check Error: ${errData.message}`);
        }

        // 2. Encode the generated JS code to Base64
        const contentBase64 = Buffer.from(code).toString('base64');

        // 3. Push to GitHub (Create if new, Update if exists)
        const commitRes = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Auto-publish: Update ${filename} via eduCBT Builder`,
                content: contentBase64,
                sha: sha || undefined, // Include SHA if updating, omit if creating new
                branch: 'main' // Change to 'master' if your repo uses master
            })
        });

        const commitData = await commitRes.json();

        if (!commitRes.ok) {
            // Check for common permissions errors
            if (commitRes.status === 403 || commitRes.status === 404) {
                 throw new Error(`Permission Denied. Ensure your Fine-Grained token has "Contents: Read and Write" access to this repository.`);
            }
            throw new Error(commitData.message || 'GitHub API Error');
        }

        // Success!
        res.status(200).json({ 
            success: true, 
            message: 'Question bank published to GitHub successfully!',
            commitUrl: commitData.commit.html_url
        });

    } catch (error) {
        console.error('Publish Error:', error);
        res.status(500).json({ error: error.message });
    }
}
