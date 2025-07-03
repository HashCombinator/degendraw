# 🚀 Deployment Guide

## Quick Deploy Options

### Option 1: Vercel (Recommended) ⚡

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub
   - Click "New Project"
   - Import your repository

3. **Configure Environment Variables**
   - In Vercel dashboard, go to **Settings** → **Environment Variables**
   - Add:
     ```
     VITE_SUPABASE_URL=https://your-project-id.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key-here
     ```

4. **Deploy**
   - Click "Deploy"
   - Your app will be live in 2-3 minutes!

### Option 2: Netlify 🌐

1. **Push to GitHub** (same as above)

2. **Connect to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect GitHub and select your repo

3. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`

4. **Add Environment Variables**
   - Go to **Site settings** → **Environment variables**
   - Add the same variables as Vercel

5. **Deploy**
   - Click "Deploy site"

### Option 3: GitHub Pages 📄

1. **Update package.json**
   ```json
   {
     "homepage": "https://yourusername.github.io/your-repo-name",
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     }
   }
   ```

2. **Install gh-pages**
   ```bash
   npm install --save-dev gh-pages
   ```

3. **Deploy**
   ```bash
   npm run deploy
   ```

## 🔧 Pre-Deployment Checklist

- [ ] **Supabase Project Created**
  - Database schema applied
  - API keys copied
  - Environment variables set

- [ ] **Code Ready**
  - No console errors
  - Local mode working
  - Online mode tested

- [ ] **Environment Variables**
  - `.env.local` file created
  - Supabase URL and key configured
  - Mode set to 'online' in gameService.ts

## 🌍 Custom Domain (Optional)

### Vercel
1. Go to **Settings** → **Domains**
2. Add your domain
3. Update DNS records as instructed

### Netlify
1. Go to **Domain settings**
2. Add custom domain
3. Update DNS records

## 📊 Post-Deployment

### Monitor Your App
- **Vercel Analytics**: Built-in performance monitoring
- **Supabase Dashboard**: Database usage and errors
- **Browser Console**: Client-side errors

### Common Issues
1. **Environment Variables**: Make sure they're set in deployment platform
2. **CORS**: Supabase handles this automatically
3. **Build Errors**: Check build logs in deployment platform

## 🎯 Next Steps

1. **Test with Friends**: Share your deployed URL
2. **Monitor Usage**: Check Supabase dashboard
3. **Scale Up**: Upgrade to Supabase Pro if needed
4. **Add Features**: Wallet integration, eraser tool

## 💰 Cost Breakdown

### Free Tier (Perfect for MVP)
- **Vercel**: $0/month
- **Supabase**: $0/month
- **Total**: $0/month

### Pro Tier (For Growth)
- **Vercel**: $20/month
- **Supabase**: $25/month
- **Total**: $45/month

---

**Your PixelBattle app is now live and ready for the world!** 🎨✨ 