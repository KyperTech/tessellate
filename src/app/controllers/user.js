'use strict'

/**
 * Module dependencies.
 */

import mongoose from 'mongoose'
import wrap from 'co-express'
import OAuth from 'oauthio'
import config from '../../config/config'

/**
 * Models
 */
const User = mongoose.model('User')
const Project = mongoose.model('Project')

/**
 * Return logged in user
 */
exports.index = wrap(function * (req, res) {
  const user = yield User.load({ _id: req.user._id })
  if (!user) return res.status(404).json({message: 'user not found'})
  res.json(user)
})

/**
 * Login
 */
exports.login = wrap(function * (req, res) {
  if (!req.user) return res.status(400).json({message: 'user required to login.'})
  const user = req.user
  const tokens = user.createTokens()
  const { _id, username, email, name, avatar_url } = user
  res.json(
    Object.assign(
      {},
      tokens,
      { user: { _id, username, email, name, avatar_url } }
    )
  )
})

/**
 * Get state token for oauthio authentication
 */
exports.getStateToken = function (req, res) {
  if (!config.oauthio || !config.oauthio.publicKey) throw new Error('OAuthio config is required.')
  const { publicKey, secretKey } = config.oauthio
  OAuth.initialize(publicKey, secretKey)
  try {
    const token = OAuth.generateStateToken(req.session)
    res.json({ token })
  } catch (err) {
    console.log('error getting state token', err)
    res.status(400).json({ message: 'error getting state token.' })
  }
}

/**
 * Authenticate with external provider
 */
exports.providerAuth = wrap(function * (req, res) {
  if (!req.body) return res.status(400).json({ message: 'provider auth data required.' })
  const { stateToken, provider, code } = req.body
  req.session.csrf_tokens = [ stateToken ]
  if (!stateToken || !provider || !code) return res.status(400).json({ message: 'stateToken, provider, and code are all required' })
  try {
    const auth = yield OAuth.auth(provider, req.session, { code })
    const providerAccount = yield auth.me()
    const { email, name, avatar, id } = providerAccount
    try {
      // Log into already existing user
      // TODO: Make search based on user's providerId (google id or github id) instead of just email & type
      const existingUser = yield User.load({ criteria: { email, provider } })
      if (existingUser) {
        const tokens = existingUser.createTokens()
        return res.json(Object.assign(existingUser, tokens))
      }
    } catch (err) {
      // User does not already exist
      let newData = {
        email, name, provider, avatar_url: avatar, providerId: id,
        username: providerAccount.alias || email.split('@')[0]
      }
      newData[req.body.provider] = providerAccount
      try {
        const user = new User(newData)
        yield user.save()
        const tokens = user.createTokens()
        return res.json(
          Object.assign(
            {},
            { user },
            tokens
          )
        )
      } catch (error) {
        if (err.toString().indexOf('Email already exists') !== -1) {
          return res.status(400).json({
            message: 'This email has already been used to signup with another provider'
          })
        }
        res.status(400).json({
          message: 'error creating new user.',
          error: error.toString()
        })
      }
    }
  } catch (err) {
    console.error('error authenticating with oAuthio', err)
    res.status(400).json({
      message: 'error authenticating',
      error: err.toString()
    })
  }
})

/**
 * Logout of current session
 */
exports.logout = wrap(function * (req, res) {
  // console.log('logout request:', req.user)
  // const user = yield User.load({ owner: req.user._id  })
  // delete user.authToken
  // yield user.save()
  res.json({
    message: 'logout successful.'
  })
})

/**
 * Return projects for logged in user
 */
exports.projects = wrap(function * (req, res) {
  const projects = yield Project.list({ owner: req.user._id })
  res.json(projects)
})

/**
 * Upload Avatar
 */
exports.avatar = wrap(function * (req, res) {
  // Handle an image
  const image = req.file
    ? req.file
    : undefined
  try {
    const user = req.profile
    yield user.uploadImageAndSave(image)
    res.json({ message: 'image uploaded successfully.' })
  } catch (error) {
    res.status(400).json({
      message: 'error uploading image.',
      error: error.toString()
    })
  }
})
