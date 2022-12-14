import * as core from '@actions/core'
import * as github from '@actions/github'
import {inspect} from 'util'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}

async function run(): Promise<void> {
  try {
    const inputs = {
      token: core.getInput('token'),
      repository: core.getInput('repository'),
      comment: core.getInput('comment')
    }
    core.debug(`Inputs: ${inspect(inputs)}`)

    const [owner, repo] = inputs.repository.split('/')
    core.debug(`Repo: ${inspect(repo)}`)

    const octokit = github.getOctokit(inputs.token)

    const {data: pulls} = await octokit.rest.pulls.list({
      owner: owner,
      repo: repo,
      state: 'open'
    })
    core.debug(`Pulls: ${inspect(pulls)}`)

    let closedCount = 0
    for (const pull of pulls) {
      if (pull.head.user && pull.head.user.login != owner) {
        if (inputs.comment && inputs.comment.length > 0) {
          core.info('Adding a comment before closing the pull request')
          await octokit.rest.issues.createComment({
            owner: owner,
            repo: repo,
            issue_number: pull.number,
            body: inputs.comment
          })
        }

        await octokit.rest.pulls.update({
          owner: owner,
          repo: repo,
          pull_number: pull.number,
          state: 'closed'
        })
        closedCount++
      }
    }
    if (closedCount > 0) {
      core.info(`Pull requests closed: ${closedCount}`)
    } else {
      core.info(`No pull requests from forks found.`)
    }
    core.setOutput('closed-count', closedCount)
  } catch (error) {
    core.debug(inspect(error))
    core.setFailed(getErrorMessage(error))
  }
}

run()
