# 🚀 Online Setup Guide

## Overview

This guide will help you set up the online version of PixelBattle using Supabase. **No additional backend (like Railway) is needed** - Supabase handles everything!

## 🎯 What You Get

- ✅ **Real-time collaboration** - Multiple users drawing together
- ✅ **Persistent data** - Drawings saved in database
- ✅ **Live chat** - Real-time messaging
- ✅ **Synchronized timers** - All users see same countdown
- ✅ **User sessions** - Ink tracking per user
- ✅ **Free hosting** - Generous free tier

## 📋 Prerequisites

1. **Supabase Account** - Sign up at [supabase.com](https://supabase.com)
2. **Database Schema** - Run the provided SQL
3. **Environment Variables** - Configure your API keys

## 🗄️ Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `pixel-battle`
   - **Database Password**: Choose a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for setup to complete (2-3 minutes)

## 🗃️ Step 2: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy and paste the entire contents of `supabase-schema.sql`
3. Click **Run** to execute the schema
4. Verify tables are created in **Table Editor**

### Tables Created:
- `game_state` - Round management
- `user_sessions` - User ink/eraser tracking
- `pixels` - Canvas pixel data
- `chat_messages` - Chat system

## 🔑 Step 3: Get API Keys

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (starts with `https://`)
   - **anon public** key (starts with `eyJ`)

## ⚙️ Step 4: Configure Environment Variables

1. Create `.env.local` file in your project root:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

2. Replace with your actual values from Step 3

## 🎮 Step 5: Enable Online Mode

1. Open `src/lib/gameService.ts`
2. Find the CONFIG object at the top
3. Change `mode: 'local'` to `mode: 'online'`
4. Save the file

## 🔧 Step 6: Configure Real-time (Optional)

### For Free Tier:
- Real-time replication is not available
- App will automatically fall back to polling
- Still works great for collaboration

### For Pro Tier:
- Real-time replication is available
- Set `enableRealTime: true` in CONFIG
- Get instant updates across users

## 🚀 Step 7: Test Online Mode

1. Start your development server: `npm run dev`
2. Open the app in your browser
3. Click the **Local/Online** toggle button
4. Test drawing and chat functionality
5. Open multiple browser tabs to test collaboration

## 🌐 Step 8: Deploy (Optional)

### Option A: Vercel (Recommended)
1. Push code to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Option B: Netlify
1. Push code to GitHub
2. Connect to Netlify
3. Add environment variables
4. Deploy

## 🔍 Troubleshooting

### Common Issues:

**1. "Failed to get online game state"**
- Check your Supabase URL and API key
- Verify database schema was created
- Check browser console for detailed errors

**2. "Real-time subscription failed"**
- Normal on free tier - app falls back to polling
- For pro tier, check real-time settings in Supabase

**3. "RLS policy violation"**
- Check Row Level Security settings
- Verify database functions were created
- Check table permissions

**4. "Network error"**
- Check internet connection
- Verify Supabase project is active
- Check CORS settings if needed

## 📊 Monitoring

### Supabase Dashboard:
- **Database** → **Tables** - View data
- **Database** → **Logs** - Check for errors
- **Realtime** → **Channels** - Monitor connections

### Browser Console:
- Look for "GameService initialized in online mode"
- Check for subscription status messages
- Monitor for any error messages

## 💰 Cost Analysis

### Supabase Free Tier:
- **Database**: 500MB
- **Bandwidth**: 2GB/month
- **Real-time**: Not available (polling fallback)
- **Perfect for**: Development and small projects

### Supabase Pro Tier ($25/month):
- **Database**: 8GB
- **Bandwidth**: 250GB/month
- **Real-time**: Available
- **Perfect for**: Production apps

## 🎯 Next Steps

1. **Test thoroughly** - Try with multiple users
2. **Monitor performance** - Check Supabase dashboard
3. **Add features** - Wallet integration, eraser tool
4. **Deploy** - Share with others
5. **Scale** - Upgrade to pro tier if needed

## 🆘 Need Help?

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Discord**: Join Supabase community
- **GitHub Issues**: Report bugs in this repo

---

**That's it!** Your PixelBattle app is now ready for online collaboration! 🎨✨ 