# The Alley Kats

Band website for **The Alley Kats**, hosted on GitHub Pages.

## Run locally

Open `index.html` in a browser, or use a simple server:

```bash
# Python 3
python3 -m http.server 8000

# Then visit http://localhost:8000
```

## Publish to GitHub Pages

1. **Create a repo** on GitHub (e.g. `alley-kats` or `alley-kats-site`).

2. **Push this folder** to the repo:
   ```bash
   git init
   git add .
   git commit -m "Initial site for The Alley Kats"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

3. **Turn on GitHub Pages**  
   In the repo: **Settings → Pages**. Under "Build and deployment", set:
   - **Source:** Deploy from a branch  
   - **Branch:** `main` / **(root)**  
   Save.

4. **Wait a minute or two.** Your site will be at:
   - `https://YOUR_USERNAME.github.io/YOUR_REPO/`

To use a custom domain later, set it in the same **Pages** settings.
