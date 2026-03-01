# Consent-Integrated Opinion Visualization for Lower Secondary Classrooms: A Practical System Report

**Authors**  
KS00Max

**Affiliation**  
[TBD: Institution Name]

**Target Participants (Planned)**  
N = 50 students

## Abstract
Classroom discussion on socio-technical issues requires students to compare multiple perspectives and explain their reasoning. At the same time, school deployment of learning systems needs low operational overhead and ethically robust data handling. This short paper reports the design and implementation of a session-linked opinion visualization system that integrates (a) informed consent, (b) pre/post learning self-assessment, and (c) teacher-facing session analytics. The system allows students to continue class activity even when they decline research use, while storing research data only for consented participants. The planned classroom deployment targets lower secondary students (N = 50). We present the implementation structure, consent/data-flow design, and an analysis plan that can be executed directly after data collection. This report contributes a reusable practical pattern for balancing classroom feasibility and research-ready evidence collection in technology-enhanced learning settings.

**Keywords:** opinion visualization; classroom practice; informed consent; digital literacy; secondary education

## 1. Introduction
Opinion-based classroom activities are increasingly used to help students reason about complex societal issues. In these settings, students need support to articulate a position, inspect opposing views, and refine their own judgment. Visualization can reduce cognitive load by making response patterns and disagreement structures visible at the class level.

However, practical school deployment has a second requirement: ethical operation that teachers can actually run inside class time. In many cases, consent and evaluation are treated as external procedures, increasing friction and reducing completion quality. A design that embeds these steps into a single class session may improve operational reliability.

This paper reports a practical system implementation that integrates consent, pre/post assessment, and opinion visualization in one session flow. The report is prepared as a short paper with data collection in progress. We focus on implementation clarity and evaluation readiness.

Research questions:
- RQ1: Can the consent-integrated flow run within ordinary class constraints?
- RQ2: Does the planned pre/post instrument capture literacy-related change tendencies?
- RQ3: Can session-level analytics support teacher reflection for next-lesson improvement?

## 2. System Design
### 2.1 Session-Linked Learning Flow
The implemented flow is:
`PRE consent + PRE survey -> personality check -> theme reading -> yes/no/unknown response -> opinion visualization -> POST survey`.

All steps are tied to a single session ID so that teachers can monitor progress and post-session summaries without manual data merging.

### 2.2 Consent and Data Handling Design
The system separates two consent decisions at PRE timing:
- consent for research use of response data
- consent for quoting free-text comments

Operational constraints are implemented as system rules:
- Students who decline consent can still complete all learning activities.
- POST research records are stored only when PRE research consent exists.
- Teacher views and exports present anonymized identifiers.
- Data scope is limited to educational improvement and research reporting.

### 2.3 Teacher-Facing Summary
The teacher dashboard provides session-level summary values:
- participant count
- consent rate
- pre/post mean changes on common items
- anonymized free-text responses

This design supports rapid post-lesson reflection and preparation for subsequent sessions.

## 3. Method (Planned Deployment)
### 3.1 Context and Participants
The planned deployment context is a lower secondary classroom unit on a socio-technical theme. The target sample size is N = 50 students (single session upper bound in the current operational setting). Final analyzed sample size will be reported after exclusions.

### 3.2 Measures
The integrated survey includes:
- 8 common PRE/POST Likert items (5-point scale)
- 3 POST-only Likert items (5-point scale)
- 3 optional POST open-text prompts

The common items are designed to capture multi-perspective reasoning, trade-off awareness, and explanation quality in self-assessment form.

### 3.3 Analysis Plan
After data collection, we will report:
- descriptive statistics (consent rate, completion rate, mean, SD)
- paired comparison for common PRE/POST items (paired t-test or Wilcoxon, depending on distribution assumptions)
- effect size (Cohen's d or r)
- thematic coding of open text with coder procedure transparency

### 3.4 Ethics Statement Template
Participation is voluntary and non-participation does not affect grades. Students can continue class activities regardless of consent choice. Personally identifiable information is not displayed in teacher-facing analytics. Data use is limited to educational improvement and research reporting under institutional policy.

## 4. Reporting Format for Results (Fill After Data Collection)
### 4.1 Participation and Consent
Table 1 will report participation and consent summary.

| Metric | Value |
|---|---:|
| Session participants | 50 (planned) |
| PRE submitted | [TBD] |
| Consented for research use | [TBD] |
| Consent rate (%) | [TBD] |
| POST submitted (among consented) | [TBD] |
| POST completion rate among consented (%) | [TBD] |

### 4.2 Pre/Post Change on Common Items
Table 2 will report item-level pre/post comparisons.

| Item | PRE mean | POST mean | Delta | p-value | Effect size |
|---|---:|---:|---:|---:|---:|
| Multi-perspective thinking | [TBD] | [TBD] | [TBD] | [TBD] | [TBD] |
| Merit-risk balancing | [TBD] | [TBD] | [TBD] | [TBD] | [TBD] |
| Explain reasoning | [TBD] | [TBD] | [TBD] | [TBD] | [TBD] |
| Infer others' viewpoints | [TBD] | [TBD] | [TBD] | [TBD] | [TBD] |
| Clarify unknown points | [TBD] | [TBD] | [TBD] | [TBD] | [TBD] |
| Stakeholder fairness view | [TBD] | [TBD] | [TBD] | [TBD] | [TBD] |
| Time-horizon awareness | [TBD] | [TBD] | [TBD] | [TBD] | [TBD] |
| Compare options with reasons | [TBD] | [TBD] | [TBD] | [TBD] | [TBD] |

### 4.3 Open-Text Themes
Open-text findings will be summarized as 2-3 dominant themes with anonymized quotations only from quote-consented responses.

## 5. Discussion Skeleton (Post-Result Insertion)
Use this structure after filling results:
- RQ1: Practical feasibility in routine class flow (time fit, completion behavior)
- RQ2: Literacy-related tendency from PRE/POST self-assessment (careful interpretation)
- RQ3: Teacher utility of dashboard outputs for lesson redesign

Keep claims non-causal unless design and analysis justify stronger inference.

## 6. Limitations and Next Steps
Expected limitations include single-context deployment, self-report bias, and short intervention horizon. Next steps are multi-class replication, objective performance indicators, and delayed follow-up measurement.

## 7. Conclusion
This short paper provides an implementation-ready and evaluation-ready reporting structure for consent-integrated opinion visualization in lower secondary classrooms. The design emphasizes both classroom feasibility and research transparency. After result insertion, the manuscript can be submitted with minimal restructuring.

## References (to be completed)
- [TBD] Classroom discussion support / argumentation learning
- [TBD] Learning analytics in K-12
- [TBD] Ethics and informed consent in educational technology
- [TBD] Opinion visualization / deliberation systems

