// /api/publish-notes.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { filename, code, repoOwner, repoName } = req.body;
    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken || !repoOwner || !repoName || !filename || !code) {
        return res.status(400).json({ error: 'Missing required fields or GitHub configuration' });
    }

    const path = `notes-banks/${filename}`;
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`;

    try {
        let sha = null;
        const checkRes = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        if (checkRes.ok) {
            const fileData = await checkRes.json();
            sha = fileData.sha;
        } else if (checkRes.status !== 404) {
            const errData = await checkRes.json();
            throw new Error(`GitHub check error: ${errData.message}`);
        }

        const contentBase64 = Buffer.from(code).toString('base64');
        const commitRes = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Auto-publish notes: ${filename}`,
                content: contentBase64,
                sha: sha || undefined,
                branch: 'main'
            })
        });

        const commitData = await commitRes.json();
        if (!commitRes.ok) {
            if (commitRes.status === 403 || commitRes.status === 404) {
                throw new Error('Permission denied. Ensure GITHUB_TOKEN has Contents: Read and Write.');
            }
            throw new Error(commitData.message || 'GitHub API error');
        }

        res.status(200).json({ success: true, commitUrl: commitData.commit.html_url });
    } catch (err) {
        console.error('publish-notes error:', err);
        res.status(500).json({ error: err.message });
    }
}
