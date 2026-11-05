import type { Metadata, Viewport } from 'next';
import './globals.css';
export const viewport: Viewport = {width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#f6f5ef'};
export const metadata: Metadata = { title: 'TrainBetter AI · 把训练变简单', description: '让科学健身，不再昂贵和复杂。基于指南的免费AI训练计划助手。' };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="zh-CN"><body>{children}</body></html>; }
