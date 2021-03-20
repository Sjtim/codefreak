import { ClockCircleOutlined } from '@ant-design/icons'
import { Tag, Tooltip } from 'antd'
import { TagProps } from 'antd/es/tag'
import { TooltipProps } from 'antd/es/tooltip'
import { Moment } from 'moment'
import React, { HTMLProps, useEffect, useState } from 'react'
import { useServerNow } from '../../hooks/useServerTimeOffset'
import { secondsToRelTime } from '../../services/time'
import Countdown from '../Countdown'
import './TimeLimitTag.less'

interface TimeLimitTagProps extends HTMLProps<HTMLSpanElement> {
  timeLimit: number
  deadline?: Moment
  suffix?: React.ReactNode
}

const TimeLimitTag: React.FC<TimeLimitTagProps> = ({
  timeLimit,
  deadline,
  suffix,
  ...htmlProps
}) => {
  const [isOver, setIsOver] = useState<boolean>()
  const now = useServerNow()

  // handle deadline changes properly
  useEffect(() => {
    setIsOver(!!deadline && deadline.isSameOrBefore(now()))
  }, [deadline, setIsOver, now])

  const relTime = secondsToRelTime(timeLimit)
  const tooltipProps: TooltipProps = {
    title: `There is a ${relTime} time limit on this task.`
  }
  const tagProps: TagProps = {
    ...htmlProps,
    className: `time-limit ${htmlProps.className}`,
    color: 'blue',
    children: relTime
  }

  if (deadline !== undefined) {
    if (isOver) {
      tooltipProps.title = 'Time is up. You cannot change your answer anymore.'
      tagProps.color = 'magenta'
      tagProps.children = "Time's up"
    } else {
      const onComplete = () => setIsOver(true)
      const countdown = <Countdown date={deadline} onComplete={onComplete} />
      tooltipProps.title = <>You have {countdown} left to finish this task.</>
      tooltipProps.className += ' running'
      tagProps.color = 'orange'
      tagProps.children = countdown
    }
  }

  return (
    <Tooltip {...tooltipProps}>
      <Tag {...tagProps}>
        <ClockCircleOutlined /> {tagProps.children} {suffix}
      </Tag>
    </Tooltip>
  )
}

export default TimeLimitTag
