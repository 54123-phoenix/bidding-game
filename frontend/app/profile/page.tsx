"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, UserRound } from "lucide-react";
import { buildResumeFromProfile, EMPTY_PROFILE, loadUserProfile, saveUserProfile, type UserProfile } from "@/lib/user-profile";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState("");
  const [education, setEducation] = useState("");
  const [experience, setExperience] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = loadUserProfile();
      setProfile(current);
      setSummary(String(current.resume?.summary || ""));
      setSkills(((current.resume?.skills as string[]) || []).join("，"));
      const firstEducation = current.resume?.education?.[0] as Record<string, unknown> | undefined;
      const firstExperience = current.resume?.experience?.[0] as Record<string, unknown> | undefined;
      setEducation(String(firstEducation?.school || ""));
      setExperience(String(firstExperience?.description || ""));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleSave = () => {
    const next: UserProfile = {
      ...profile,
      resume: buildResumeFromProfile({
        name: profile.name,
        summary,
        skills,
        education,
        experience,
      }),
    };
    saveUserProfile(next);
    setProfile(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <main className="product-shell min-h-screen bg-[#05070a] px-5 py-6 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400 transition hover:text-cyan-200">
            <ArrowLeft size={14} /> 返回仪表盘
          </Link>
          <div className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
            Local Profile
          </div>
        </header>

        <section className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-200">
            <UserRound size={14} /> 用户信息管理
          </div>
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">先完善档案，再开始谈薪。</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">这里保存你的默认简历摘要。之后进入真实模拟时，可以直接复用档案简历，不必每次上传 PDF。</p>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="surface-base rounded-3xl p-5 space-y-4">
            <Field label="姓名" value={profile.name} onChange={(value) => setProfile({ ...profile, name: value })} placeholder="例如：Diana Zhao" />
            <Field label="目标岗位" value={profile.targetRole} onChange={(value) => setProfile({ ...profile, targetRole: value })} placeholder="例如：高级后端工程师" />
            <Field label="目标城市" value={profile.targetCity} onChange={(value) => setProfile({ ...profile, targetCity: value })} placeholder="例如：北京 / 上海 / 深圳" />
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-400">默认策略</label>
              <select
                value={profile.preferredStrategy}
                onChange={(event) => setProfile({ ...profile, preferredStrategy: event.target.value as UserProfile["preferredStrategy"] })}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
              >
                <option value="balanced">稳健型</option>
                <option value="aggressive">激进型</option>
                <option value="conservative">保守型</option>
              </select>
            </div>
          </div>

          <div className="surface-raised rounded-3xl p-5 space-y-4">
            <TextArea label="简历摘要" value={summary} onChange={setSummary} placeholder="用 1-2 句话概括你的工作年限、方向和优势。" rows={3} />
            <TextArea label="技能标签" value={skills} onChange={setSkills} placeholder="Go，Kubernetes，Redis，高并发，推荐系统" rows={3} />
            <TextArea label="教育背景" value={education} onChange={setEducation} placeholder="例如：浙江大学 硕士 计算机科学" rows={2} />
            <TextArea label="核心经历" value={experience} onChange={setExperience} placeholder="写出最能支持谈薪的项目结果，例如 QPS、成本、转化率、团队规模。" rows={5} />
            <button onClick={handleSave} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
              <Save size={16} /> {saved ? "已保存" : "保存用户档案"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold text-slate-400">{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-slate-200 placeholder:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50" />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; rows: number }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold text-slate-400">{label}</label>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm leading-6 text-slate-200 placeholder:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50" />
    </div>
  );
}
