import type { AnalysisData } from "../../MainApp";
import { CheckPoints } from "./CheckPoints";
import { DetailedSummary } from "./DetailedSummary";
import { Keywords } from "./Keywords";
import { ThreeLineSummary } from "./ThreeLineSummary";

interface RightPanelAnalysisProps {
  analysisData: AnalysisData;
  onCitationClick?: (page: number) => void;
}

export function RightPanelAnalysis({ analysisData, onCitationClick }: RightPanelAnalysisProps) {
  return (
    <>
      <Keywords keywords={analysisData.keywords} />
      <ThreeLineSummary summary={analysisData.summaries[0]} onCitationClick={onCitationClick} />
      <DetailedSummary summary={analysisData.summaries[1]} onCitationClick={onCitationClick} />
      {/* <CheckPoints issues={analysisData.issues} onCitationClick={onCitationClick} /> */}
    </>
  );
}
