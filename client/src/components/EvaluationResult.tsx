import {Card, Collapse, Empty, Icon, Result, Typography} from 'antd'
import React, {useState} from 'react'
import ReactMarkdown from 'react-markdown'
import {
  EvaluationStep,
  EvaluationStepResult,
  Feedback,
  Feedback as FeedbackEntity,
  FeedbackSeverity,
  FeedbackStatus,
  useGetDetailedEvaluatonQuery
} from '../generated/graphql'
import AsyncPlaceholder from './AsyncContainer'
import SyntaxHighlighter from './code/SyntaxHighlighter'
import {CodeViewerCard} from './CodeViewer'
import './EvaluationResult.less'
import './autograder/Points.less'
import EvaluationStepResultIcon from './EvaluationStepResultIcon'
import {compare} from '../services/util'
import SortSelect from './SortSelect'
import PointsEdit from "./autograder/PointsEdit";
import GradeView from "./autograder/GradeView";

const { Text } = Typography

const FileReference: React.FC<{ data: FeedbackEntity['fileContext'] }> = ({
  data
}) => {
  if (!data) {
    return null
  }
  let text = data.path

  if (data.lineStart) {
    text += `:${data.lineStart}`
  }
  if (data.lineEnd) {
    text += `-${data.lineEnd}`
  }

  return <Text code>{text}</Text>
}

const LongDescriptionMarkdown: React.FC<{ source: string }> = ({ source }) => {
  return (
    <ReactMarkdown
      source={source}
      escapeHtml={false}
      className="feedback-long-description"
    />
  )
}

const severityIconMap: Record<FeedbackSeverity, string> = {
  INFO: 'info-circle',
  MINOR: 'warning',
  MAJOR: 'exclamation-circle',
  CRITICAL: 'close-circle'
}
const FeedbackSeverityIcon: React.FC<{ severity: FeedbackSeverity }> = ({
  severity
}) => {
  let iconType = 'question-circle'
  if (severity && severityIconMap[severity]) {
    iconType = severityIconMap[severity]
  }
  const severityClass = severity ? severity.toString().toLowerCase() : 'default'
  return (
    <Icon
      type={iconType}
      className={`feedback-icon feedback-icon-severity-${severityClass}`}
    />
  )
}

const renderFeedbackPanel = (answerId: string, feedback: Feedback) => {
  let icon = null
  // either show the success icon or the severity of failure
  switch (feedback.status) {
    case FeedbackStatus.Failed:
      if (feedback.severity) {
        icon = <FeedbackSeverityIcon severity={feedback.severity} />
      } else {
        icon = (
          <Icon
            type="exclamation-circle"
            className="feedback-icon feedback-icon-failed"
          />
        )
      }
      break
    case FeedbackStatus.Success:
      icon = (
        <Icon
          type="check-circle"
          className="feedback-icon feedback-icon-success"
        />
      )
      break
    case FeedbackStatus.Ignore:
      icon = (
        <Icon type="forward" className="feedback-icon feedback-icon-ignore" />
      )
      break
  }

  const title = (
    <>
      {icon}
      <ReactMarkdown
        source={feedback.summary}
        allowedTypes={[
          'inlineCode',
          'text',
          'strong',
          'delete',
          'emphasis',
          'link'
        ]}
        unwrapDisallowed
      />
    </>
  )
  let body = null
  if (feedback.fileContext) {
    const { lineStart, lineEnd } = feedback.fileContext
    body = (
      <CodeViewerCard
        answerId={answerId}
        path={feedback.fileContext.path}
        lineStart={lineStart || undefined}
        lineEnd={lineEnd || undefined}
      />
    )
  }

  if (feedback.longDescription) {
    body = (
      <>
        {body}
        <LongDescriptionMarkdown source={feedback.longDescription} />
      </>
    )
  }

  return (
    <Collapse.Panel
      disabled={!body}
      showArrow={!!body}
      header={title}
      extra={<FileReference data={feedback.fileContext} />}
      key={feedback.id}
    >
      {body}
    </Collapse.Panel>
  )
}

const EvaluationResult: React.FC<{ evaluationId: string }> = ({
  evaluationId
}) => {
  const result = useGetDetailedEvaluatonQuery({ variables: { evaluationId } })

  if (result.data === undefined) {
    return <AsyncPlaceholder result={result} />
  }

  const { evaluation } = result.data


  const gradeView=(
    <p className="grade-view-container">
      <GradeView
        evaluationId={evaluation.id}
      />
    </p>
  )



  return (
    <>{gradeView? gradeView : null}
      {evaluation.steps.map(step => (
        <EvaluationStepPanel
          answerId={evaluation.answer.id}
          step={step}
          key={step.id}
        />
      ))}

    </>
  )
}

const severityOrder: Record<FeedbackSeverity, number> = {
  INFO: 3,
  MINOR: 2,
  MAJOR: 1,
  CRITICAL: 0
}
const statusOrder: Record<FeedbackStatus, number> = {
  FAILED: 0,
  SUCCESS: 1,
  IGNORE: 2
}

const FeedbackSortMethods: Record<
  string,
  (a: Feedback, b: Feedback) => number
> = {
  SEVERITY: (a, b) =>
    compare(a.severity, b.severity, value =>
      value ? severityOrder[value] : 0
    ),
  STATUS: (a, b) =>
    compare(a.status, b.status, value => (value ? statusOrder[value] : 0)),
  FILE: (a, b) => {
    if (a.fileContext && b.fileContext) {
      if (a.fileContext.path === b.fileContext.path) {
        return (a.fileContext.lineStart || 0) - (b.fileContext.lineStart || 0)
      }
      return a.fileContext.path.localeCompare(b.fileContext.path)
    } else if (a.fileContext) {
      return -1
    } else if (b.fileContext) {
      return 1
    }
    return 0
  }
}

const EvaluationStepPanel: React.FC<{
  answerId: string
  step: Omit<EvaluationStep, 'definition' | 'status'> & {
    definition: Pick<EvaluationStep['definition'], 'title'>
  }
}> = ({ answerId, step }) => {
  const title = (
    <>
      <EvaluationStepResultIcon stepResult={step.result} />{' '}
      {step.definition.title}
    </>
  )

  const [sortValue, setSortValue] = useState('FILE')
  const feedbackList = step.feedback
  const handleSortChange = (value: string) => setSortValue(value)
  const FeedbackSortOptions: string[] = Object.keys(FeedbackSortMethods)
  const sorter = (
    <SortSelect
      defaultValue={sortValue}
      values={FeedbackSortOptions}
      onSortChange={handleSortChange}
    />
  )

  const renderFeedback = (feedback: Feedback) =>
    renderFeedbackPanel(answerId, feedback)

  const renderedFeedbackList = feedbackList
    .slice()
    .sort(FeedbackSortMethods[sortValue])
    .map(renderFeedback)


  const pointsField =(<p>
    <PointsEdit
      evaluationStepId={step.id}
    />
  </p>)

  let body
  if (!step.feedback || step.feedback.length === 0) {
    if (step.result === EvaluationStepResult.Success) {
      body = ([
        <Result
          icon={<Icon type="smile" theme="twoTone" />}
          title="All checks passed – good job!"
        />,pointsField]
      )
    } else if (step.summary) {
      body = [<SyntaxHighlighter>{step.summary}</SyntaxHighlighter>,pointsField]
    }
  } else {
    body = [<Collapse>{renderedFeedbackList}</Collapse>,pointsField]
  }

  if (!body) {
    if(step.result === EvaluationStepResult.Failed){
      body = ([
          <Result
            icon={<Icon type="smile" theme="twoTone" />}
            title="Most checks passed – good job!"
          />,pointsField]
      )
    }else{
      body = <Empty />
    }
  }

  return (
    <Card
      title={title}
      key={step.id}
      extra={sorter}
      className="evaluation-result-panel"
    >
      {body}
    </Card>
  )
}

export default EvaluationResult
