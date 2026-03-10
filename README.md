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

## Image quality (avoid blur)

Pictures can look blurry on the site if the **file is smaller than the display size**. The browser upscales small images, which softens them.

- **Homepage hero** (`images/hero-band-logo.png`): Use an image **at least 720px wide** (ideally 1440px for retina). Replace the file and keep the same filename.
- **Media / gallery photos** (`images/`): Use images at least **800–1000px** on the long side so they stay sharp in the grid and when viewed larger.

Rule of thumb: the image file’s width (in pixels) should be at least as large as the width it’s shown at on screen; double that for crisp look on high-DPI screens.
