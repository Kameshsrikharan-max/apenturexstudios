import { CloseOutlined, TrophyOutlined, WarningOutlined } from "@ant-design/icons";
import { getOverallStats } from "../../utils/trainingQuizStore";
import "./QuizPanel.css";

export default function OverallReportModal({ onClose }: { onClose: () => void }) {
  const stats = getOverallStats();

  return (
    <div className="qp-modal-overlay" onMouseDown={onClose}>
      <div className="qp-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="qp-modal-head">
          <h3>
            <TrophyOutlined /> Overall Quiz Report
          </h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <CloseOutlined />
          </button>
        </div>

        <div className="qp-modal-summary">
          <div>
            <strong>
              {stats.attemptedModules}/{stats.totalModulesWithQuiz}
            </strong>
            <span>Modules attempted</span>
          </div>
          <div>
            <strong>{stats.averagePercentage}%</strong>
            <span>Average score</span>
          </div>
          <div>
            <strong>{stats.passedModules}</strong>
            <span>Modules passed</span>
          </div>
          <div>
            <strong>
              {stats.overallScore}/{stats.overallTotal || 0}
            </strong>
            <span>Total marks</span>
          </div>
        </div>

        {stats.weakModules.length > 0 && (
          <div className="qp-modal-weak">
            <h4>
              <WarningOutlined /> Needs improvement
            </h4>
            {stats.weakModules.map((m) => (
              <div key={m.moduleId} className="qp-weak-module">
                <div className="qp-weak-module-head">
                  <strong>{m.title}</strong>
                  <span>{m.latestPercentage}%</span>
                </div>
                {m.weakPoints.length > 0 && (
                  <ul>
                    {m.weakPoints.slice(0, 4).map((wp, i) => (
                      <li key={i}>{wp}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="qp-modal-all">
          <h4>All modules</h4>
          {stats.moduleStats.length === 0 && (
            <p style={{ fontSize: 12.5, color: "var(--th-text-dim)" }}>
              No quizzes have been added to QUIZ_BANK yet.
            </p>
          )}
          {stats.moduleStats.map((m) => (
            <div key={m.moduleId} className="qp-modal-row">
              <span>{m.title}</span>
              <span
                className={m.attempted ? (m.passed ? "qp-tag-pass" : "qp-tag-fail") : "qp-tag-none"}
              >
                {m.attempted ? `${m.latestPercentage}%` : "Not attempted"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}