"use client";

import { useState, useCallback } from "react";
import { uploadResume, parseJD, initGame, type GameInitResponse } from "@/lib/game-api";
import type { SetupParams } from "./types";

const DEMO_RESUME = {
  resume_id: "demo-quick", name: "体验用户", email: "demo@example.com",
  summary: "4年Go后端开发经验，熟悉微服务架构",
  skills: ["Go", "Python", "Kubernetes", "Docker", "MySQL", "Redis", "Kafka", "gRPC", "Linux", "微服务"],
  skill_levels: {"Go": "精通", "Python": "熟练", "Kubernetes": "熟练", "Redis": "熟练"},
  education: [{school: "浙江大学", degree: "硕士", major: "计算机科学与技术", graduation_year: 2022}],
  experience: [
    {company: "阿里巴巴", title: "后端开发工程师",
     description: "负责电商系统微服务架构设计，QPS从5k提升至50k。设计多级缓存方案，P99延迟降低82%。带领3人团队完成核心链路重构。",
     tech_stack: ["Go", "Kubernetes", "Redis", "Kafka", "MySQL"], start_date: "2022-07-01", end_date: "2026-05-01"},
  ],
  projects: [{name: "微服务化改造", description: "QPS 50k+, P99<50ms, 降低延迟82%", tech_stack: ["Go", "Kubernetes"]}],
  competitions: [], certifications: [],
};

const DEMO_JD_TEXT = "字节跳动招聘高级后端工程师（P7），负责微服务架构设计与高并发系统开发。要求精通Go，熟悉Kubernetes、Redis、Kafka，3-5年经验。薪资50-90万/年。";

export function useSetup(p: SetupParams) {
  const [file, setFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState("");

  const applyInitResponse = useCallback((data: GameInitResponse) => {
    if (data.status === "screening_failed") {
      const screening = (data.screening || {}) as Record<string, unknown>;
      const score = Math.round(((screening.score as number) || 0) * 100);
      p.setError(`初筛未通过（匹配度 ${score}%）。${String(screening.feedback || "简历与岗位匹配度不足")}`);
      p.setLoading(false);
      return;
    }
    if (data.status !== "ok") { p.setError(String(data.message || "初始化失败")); p.setLoading(false); return; }

    p.setSessionId(data.session_id || "");
    p.setGameState(data.game_state || null);
    p.setGameRound(data.round || 0);
    p.setActions((data.round_actions || []) as Record<string, unknown>[]);
    p.setPrompt(data.prompt || "");
    p.setOptions((data.options || []) as Record<string, unknown>[]);
    p.setHrPersona((data.hr_persona as Record<string, unknown>) || null);
    p.setHrPatience(data.hr_patience ?? 1.0);
    p.setInfoCards(data.info_cards || []);
    p.setTrustState(data.trust_state || null);
    p.setInfoNarrative(data.info_narrative || "");
    p.setStep(2);
  }, []);

  const handleQuickDemo = useCallback(async () => {
    p.setLoading(true); p.setError(""); p.setProgress("准备中...");
    try {
      p.setProgress("正在解析简历...");
      const demoText = `姓名: ${DEMO_RESUME.name}\n技能: ${DEMO_RESUME.skills.join(", ")}\n教育: ${DEMO_RESUME.education[0].school} ${DEMO_RESUME.education[0].degree}\n公司: ${DEMO_RESUME.experience[0].company} ${DEMO_RESUME.experience[0].title}\n${DEMO_RESUME.experience[0].description}`;
      const blob = new Blob([demoText], { type: "text/plain" });
      const uploadResult = await uploadResume(blob, "demo.txt", "text");
      if (uploadResult.status !== "ok") { p.setError(String(uploadResult.message || "解析失败")); p.setLoading(false); return; }
      p.setResumeData(uploadResult.resume as Record<string, unknown>);
      p.setResumePreview(uploadResult.resume as Record<string, unknown>);

      p.setProgress("正在分析岗位...");
      const jdResult = await parseJD(DEMO_JD_TEXT);
      if (jdResult.status !== "ok") { p.setError(String(jdResult.message || "JD解析失败")); p.setLoading(false); return; }
      p.setJobData(jdResult.job as Record<string, unknown>);

      p.setProgress("正在初始化博弈...");
      const initResult = await initGame({
        resume: uploadResult.resume as Record<string, unknown>,
        job: jdResult.job as Record<string, unknown>,
        strategy: "balanced", market_condition: "normal", model: p.model,
      });
      applyInitResponse(initResult);
    } catch (e: unknown) { p.setError(e instanceof Error ? e.message : "连接失败"); }
    p.setLoading(false); p.setProgress("");
  }, [p.model]);

  const handleFileChange = useCallback(async (f: File | null) => {
    setFile(f);
    if (!f) { p.setResumePreview(null); p.setResumeData(null); return; }
    p.setLoading(true); p.setError(""); p.setProgress("正在解析简历...");
    try {
      const sourceType = f.name.endsWith(".pdf") ? "pdf" : "text";
      const result = await uploadResume(f, undefined, sourceType);
      if (result.status !== "ok") { p.setError(String(result.message || "简历解析失败")); p.setLoading(false); return; }
      p.setResumeData(result.resume as Record<string, unknown>);
      p.setResumePreview(result.resume as Record<string, unknown>);
    } catch (e: unknown) { p.setError(e instanceof Error ? e.message : "上传失败"); }
    p.setLoading(false); p.setProgress("");
  }, []);

  const handleStartNegotiation = useCallback(async () => {
    if (!p.resumeData) { p.setError("请先上传简历"); return; }
    if (!jdText.trim()) { p.setError("请粘贴岗位描述"); return; }
    if (jdText.trim().length < 20) { p.setError("岗位描述太短，请粘贴完整的招聘信息"); return; }

    p.setLoading(true); p.setError(""); p.setProgress("正在分析岗位...");
    try {
      const jdResult = await parseJD(jdText);
      if (jdResult.status !== "ok") { p.setError(String(jdResult.message || "岗位解析失败")); p.setLoading(false); return; }
      p.setJobData(jdResult.job as Record<string, unknown>);

      p.setProgress("正在初始化博弈...");
      const initResult = await initGame({
        resume: p.resumeData!,
        job: jdResult.job as Record<string, unknown>,
        strategy: p.strategy, market_condition: p.market, model: p.model,
      });
      applyInitResponse(initResult);
    } catch (e: unknown) { p.setError(e instanceof Error ? e.message : "连接失败"); }
    p.setLoading(false); p.setProgress("");
  }, [jdText, p.resumeData, p.strategy, p.market, p.model]);

  return {
    file, setFile,
    jdText, setJdText,
    handleQuickDemo, handleFileChange, handleStartNegotiation,
  };
}
