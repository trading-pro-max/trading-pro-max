import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        if (!email) return null;

        const user = await db.user.upsert({
          where: { email },
          update: {},
          create: { email, isActive: true, plan: 'free' },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.email,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await db.user.findUnique({ where: { email: user.email } });
        token.email = user.email;
        token.plan = dbUser?.plan || 'free';
        token.isActive = dbUser?.isActive ?? true;
      } else if (token?.email) {
        const dbUser = await db.user.findUnique({ where: { email: String(token.email) } });
        token.plan = dbUser?.plan || 'free';
        token.isActive = dbUser?.isActive ?? true;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = String(token.email || '');
        (session.user as any).plan = token.plan || 'free';
        (session.user as any).isActive = token.isActive ?? true;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'trading-pro-max-secret',
};
