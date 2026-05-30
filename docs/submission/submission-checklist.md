# Submission Checklist

## Required Files

- [ ] Source code repository or archive.
- [ ] README updated and aligned with `薪资谈判教练` positioning.
- [ ] PPT deck exported as `.pptx` and `.pdf`.
- [ ] Demo video exported as `.mp4`.
- [ ] Optional: screenshots folder.
- [ ] Optional: deployment instructions or Docker notes.

## Recommended Document Set

- `README.md` — product positioning, architecture, boundaries.
- `docs/demo-checklist.md` — demo path and fallback plan.
- `docs/judges-faq.md` — prepared answers for reviewer questions.
- `docs/submission/ppt-outline.md` — slide-by-slide content.
- `docs/submission/video-script.md` — narration and screen route.
- `docs/submission/submission-checklist.md` — this checklist.

## PPT Checklist

- [ ] Opening slide clearly says `薪资谈判教练`.
- [ ] One slide explains user pain.
- [ ] One slide shows product loop.
- [ ] One slide shows CoachPanel.
- [ ] One slide shows chip cards and reputation.
- [ ] One slide shows memo / strategy tree / What-if.
- [ ] One slide explains rule-first architecture.
- [ ] One slide states boundaries clearly.
- [ ] Closing slide has the sentence: `不是让 AI 替用户谈薪，而是让用户更会谈薪。`

## Video Checklist

- [ ] Start with homepage.
- [ ] Show dashboard or seeded histories.
- [ ] Show CoachPanel in negotiation.
- [ ] Show chip cards and reputation badge.
- [ ] Show result memo.
- [ ] Show strategy tree.
- [ ] Show What-if slider.
- [ ] Mention rule-first and LLM-optional boundary.
- [ ] Mention What-if is approximate.
- [ ] Mention local reputation is not real-world industry reputation.

## Technical Verification

Run before packaging:

```bash
cd frontend
npm run lint
npm run build
```

Expected:

- No lint errors.
- Existing warnings may remain for image optimization and hook dependencies.
- Build succeeds.

Check key pages:

- [ ] `http://localhost:3000`
- [ ] `http://localhost:3000/play`
- [ ] `http://localhost:3000/dashboard`
- [ ] `http://localhost:3000/demo`

## Content Boundaries

Do not claim:

- [ ] Real salary websites are scraped live.
- [ ] What-if is strict equilibrium recomputation.
- [ ] Reputation score is real-world industry reputation.
- [ ] LLM is the sole decision source.
- [ ] The tool replaces salary research, legal advice, or career counseling.

## Packaging Notes

Suggested folder structure for final delivery:

```text
submission/
├── README.pdf
├── demo-video.mp4
├── slides.pptx
├── slides.pdf
├── source-code.zip or repository-link.txt
└── optional-screenshots/
```

## Final Sanity Check

- [ ] The first page or first 10 seconds communicates the product is a salary negotiation coach.
- [ ] The demo has one clear user story.
- [ ] The video shows both process coaching and result recap.
- [ ] The limitations are stated proactively.
- [ ] The repository branch is pushed.
