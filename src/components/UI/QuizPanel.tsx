import { useMemo, useState } from "react";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  RedoOutlined,
  HistoryOutlined,
  TrophyOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import {
  getModuleQuiz,
  hasQuiz,
  getAttempts,
  recordAttempt,
  getBestAttempt,
  PASS_PERCENTAGE,
  type QuizAttempt,
} from "../../utils/trainingQuizStore";
import "./QuizPanel.css";

type Stage = "intro" | "active" | "result" | "review" | "history";

export default function QuizPanel({
  moduleId,
  moduleTitle,
}: {
  moduleId: string;
  moduleTitle: string;
}) {
  const questions = useMemo(() => getModuleQuiz(moduleId), [moduleId]);
  const [stage, setStage] = useState<Stage>("intro");
  const [qIndex, setQIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, string | null>>({});
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const [historyViewId, setHistoryViewId] = useState<string | null>(null);

  const attempts = getAttempts(moduleId);
  const best = getBestAttempt(moduleId);

  if (!hasQuiz(moduleId)) {
    return (
      <div className="qp-empty">
        <p>No quiz has been added for this module yet — check back soon.</p>
      </div>
    );
  }

  const startQuiz = () => {
    setSelections({});
    setQIndex(0);
    setHistoryViewId(null);
    setStage("active");
  };

  const selectOption = (questionId: string, optionId: string) => {
    setSelections((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const nextQuestion = () => {
    if (qIndex < questions.length - 1) {
      setQIndex((i) => i + 1);
      return;
    }
    const attempt = recordAttempt(moduleId, selections);
    setResult(attempt);
    setStage("result");
  };

  const currentQuestion = questions[qIndex];
  const answeredCount = Object.values(selections).filter(Boolean).length;
  const showingReview = stage === "review" || historyViewId !== null;
  const viewedAttempt = historyViewId ? attempts.find((a) => a.id === historyViewId) ?? null : result;

  return (
    <div className="qp-root">
      {showingReview && viewedAttempt && (
        <div className="qp-review">
          <button
            type="button"
            className="qp-back-link"
            onClick={() => {
              const goingBackToHistory = historyViewId !== null;
              setHistoryViewId(null);
              setStage(goingBackToHistory ? "history" : "result");
            }}
          >
            ← Back
          </button>
          <div className="qp-review-list">
            {viewedAttempt.answers.map((a, i) => (
              <div
                key={a.questionId}
                className={`qp-review-item ${a.correct ? "is-correct" : "is-wrong"}`}
              >
                <div className="qp-review-q">
                  <span className="qp-review-index">Q{i + 1}</span>
                  {a.correct ? <CheckCircleFilled /> : <CloseCircleFilled />}
                  <strong>{a.question}</strong>
                </div>
                <div className="qp-review-answer">
                  Your answer: <span>{a.selectedText}</span>
                </div>
                {!a.correct && (
                  <div className="qp-review-answer">
                    Correct answer: <span>{a.correctText}</span>
                  </div>
                )}
                <div className="qp-review-explanation">{a.explanation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!showingReview && stage === "intro" && (
        <div className="qp-intro">
          <div className="qp-intro-stat">
            <span>{questions.length} Questions</span>
            <span>Pass mark: {PASS_PERCENTAGE}%</span>
          </div>

          {best && (
            <div className="qp-best-score">
              <TrophyOutlined /> Best score: {best.score}/{best.total} ({best.percentage}%)
              {best.passed ? " · Passed" : " · Not yet passed"}
            </div>
          )}

          <button type="button" className="qp-primary-btn" onClick={startQuiz}>
            {attempts.length ? "Retake Quiz" : "Start Quiz"} <ArrowRightOutlined />
          </button>

          {attempts.length > 0 && (
            <button type="button" className="qp-secondary-btn" onClick={() => setStage("history")}>
              <HistoryOutlined /> View attempt history ({attempts.length})
            </button>
          )}
        </div>
      )}

      {!showingReview && stage === "active" && currentQuestion && (
        <div className="qp-active">
          <div className="qp-progress">
            <div className="qp-progress-track">
              <div
                className="qp-progress-fill"
                style={{ width: `${((qIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
            <span>
              Question {qIndex + 1} of {questions.length}
            </span>
          </div>

          <h4 className="qp-question">{currentQuestion.question}</h4>

          <div className="qp-options">
            {currentQuestion.options.map((opt) => {
              const checked = selections[currentQuestion.id] === opt.id;
              return (
                <label key={opt.id} className={`qp-option ${checked ? "is-checked" : ""}`}>
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    checked={checked}
                    onChange={() => selectOption(currentQuestion.id, opt.id)}
                  />
                  <span className="qp-option-dot" />
                  <span>{opt.text}</span>
                </label>
              );
            })}
          </div>

          <div className="qp-active-footer">
            <span className="qp-answered-count">
              {answeredCount}/{questions.length} answered
            </span>
            <button
              type="button"
              className="qp-primary-btn"
              disabled={!selections[currentQuestion.id]}
              onClick={nextQuestion}
            >
              {qIndex === questions.length - 1 ? "Submit Quiz" : "Next"} <ArrowRightOutlined />
            </button>
          </div>
        </div>
      )}

      {!showingReview && stage === "result" && result && (
        <div className="qp-result">
          <div className={`qp-result-badge ${result.passed ? "is-pass" : "is-fail"}`}>
            {result.passed ? <CheckCircleFilled /> : <CloseCircleFilled />}
            <div>
              <strong>
                {result.score}/{result.total}
              </strong>
              <span>
                {result.percentage}% · {result.passed ? "Passed" : "Not passed"}
              </span>
            </div>
          </div>

          {result.answers.some((a) => !a.correct) && (
            <div className="qp-improve">
              <h5>What to improve on "{moduleTitle}"</h5>
              <ul>
                {result.answers
                  .filter((a) => !a.correct)
                  .map((a) => (
                    <li key={a.questionId}>{a.explanation}</li>
                  ))}
              </ul>
            </div>
          )}

          <div className="qp-result-actions">
            <button type="button" className="qp-secondary-btn" onClick={() => setStage("review")}>
              Review answers
            </button>
            <button type="button" className="qp-primary-btn" onClick={startQuiz}>
              <RedoOutlined /> Retake quiz
            </button>
          </div>
        </div>
      )}

      {!showingReview && stage === "history" && (
        <div className="qp-history">
          <button type="button" className="qp-back-link" onClick={() => setStage("intro")}>
            ← Back
          </button>
          <div className="qp-history-list">
            {attempts
              .slice()
              .reverse()
              .map((a) => (
                <div key={a.id} className="qp-history-item">
                  <div>
                    <strong>
                      {a.score}/{a.total}
                    </strong>{" "}
                    ({a.percentage}%)
                    <span className={a.passed ? "qp-tag-pass" : "qp-tag-fail"}>
                      {a.passed ? "Passed" : "Not passed"}
                    </span>
                  </div>
                  <div className="qp-history-meta">
                    <span>{new Date(a.date).toLocaleString()}</span>
                    <button type="button" onClick={() => setHistoryViewId(a.id)}>
                      View
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}