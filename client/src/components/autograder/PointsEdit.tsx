import './Points.less'
import React, { useState } from 'react'
import {
  PointsOfEvaluationStep,
  PointsOfEvaluationStepInput,
  useGetPointsOfEvaluationStepByEvaluationStepIdQuery,
  useUpdatePointsOfEvaluationStepMutation
} from '../../generated/graphql'
import useHasAuthority from '../../hooks/useHasAuthority'
import { Empty, InputNumber, Switch } from 'antd'
import { debounce } from 'ts-debounce'
import {FetchGrade} from "../../hooks/useGetGrade";

const PointsEdit: React.FC<{
  evaluationStepId: string
  fetchGrade: FetchGrade
}> = props => {
  const evaluationStepId = props.evaluationStepId

  const result = useGetPointsOfEvaluationStepByEvaluationStepIdQuery({
    variables: { evaluationStepId }
  })

  const [changeable, setChangeable] = useState<boolean>(false)

  const onEnabledChange = (state: boolean) => {
    setChangeable(state)
  }
  const [
    updatePointsOfEvaluationStep
  ] = useUpdatePointsOfEvaluationStepMutation({
    onCompleted: () => {
      result.refetch()
    }
  })

  const auth = useHasAuthority('ROLE_TEACHER')
  /**
   * Output
   */
  if (result.data !== null) {
    if (result.data !== undefined) {
      const data = result.data

      const input: PointsOfEvaluationStepInput = {
        calcCheck: data.pointsOfEvaluationStepByEvaluationStepId.calcCheck!!,
        mistakePoints: data.pointsOfEvaluationStepByEvaluationStepId
          .mistakePoints!!,
        edited: data.pointsOfEvaluationStepByEvaluationStepId.edited!!,
        id: data.pointsOfEvaluationStepByEvaluationStepId.id!!,
        reachedPoints: data.pointsOfEvaluationStepByEvaluationStepId
          .reachedPoints!!,
        resultCheck: data.pointsOfEvaluationStepByEvaluationStepId.resultCheck!!
      }

      if (result.error) return <div>Error!</div>

      const onPoEStepChange = (value: number) => {
        if (value !== undefined) {
          input.reachedPoints = value
          input.edited = true
          debounce(
            updatePointsOfEvaluationStep({ variables: { input } }).then,
            1000
          )
        }
      }

      if (
        data.pointsOfEvaluationStepByEvaluationStepId.gradeDefinitionMax ===
        null
      ) {
        return <div />
      } else {
        if (
          !data.pointsOfEvaluationStepByEvaluationStepId.gradeDefinitionMax!
            .active
        )
          return <div />
      }

      if (auth) {
        return renderEdit({
          poe: data.pointsOfEvaluationStepByEvaluationStepId,
          onChange: onPoEStepChange,
          onSwitch: onEnabledChange,
          changeable
        })
      } else {
        return renderView({
          reachedPoints: data.pointsOfEvaluationStepByEvaluationStepId!
            .reachedPoints!!,
          maxPoints: data.pointsOfEvaluationStepByEvaluationStepId
            .gradeDefinitionMax!.maxPoints
        })
      }
    } else {
      return <Empty />
    }
  } else {
    return <Empty />
  }
}

const renderView: React.FC<{
  reachedPoints: number
  maxPoints: number | undefined
}> = props => {
  return (
    <div className="points-view">
      {props.reachedPoints}/{props.maxPoints} Points
    </div>
  )
}

const renderEdit: React.FC<{
  poe: PointsOfEvaluationStep
  onChange: (value: number) => void
  onSwitch: (changeable: boolean) => void
  changeable: boolean
}> = props => {
  const onChangeDefinitely = (val: number | undefined) => {
    if (val !== undefined) {
      if (val > props.poe.gradeDefinitionMax!.maxPoints) {
        props.onChange(props.poe.gradeDefinitionMax!.maxPoints)
      } else {
        props.onChange(val)
      }
    }
  }

  if (props.poe.gradeDefinitionMax!.maxPoints === 0) return <></>

  const input = (
    <InputNumber
      title={'Points'}
      min={0}
      max={props.poe.gradeDefinitionMax!.maxPoints}
      onChange={onChangeDefinitely}
      inputMode={'numeric'}
      value={props.poe.reachedPoints!!}
      disabled={!props.changeable}
    />
  )

  const lever = (
    <Switch defaultChecked={props.changeable} onChange={props.onSwitch} />
  )

  return (
    <div className="points-edit">
      {lever}
      {input} / {props.poe.gradeDefinitionMax!.maxPoints}
    </div>
  )
}

export default PointsEdit