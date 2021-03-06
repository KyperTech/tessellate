'use strict'

/**
 * Module dependencies.
 */

import mongoose from 'mongoose'
import { find } from 'lodash'

const Schema = mongoose.Schema

/**
 * Project Schema
 */

const ProjectSchema = new Schema({
  name: { type: String, default: '', trim: true },
  owner: { type: Schema.ObjectId, ref: 'User' },
  private: { type: Boolean, default: false },
  collaborators: [ { type: Schema.ObjectId, ref: 'User' } ],
  createdAt: { type: Date, default: Date.now }
})

/**
 * Validations
 */
ProjectSchema.path('owner').required(true, 'Project owner cannot be blank')

ProjectSchema.path('name').required(true, 'Project name cannot be blank')

ProjectSchema.path('name').validate(function (name, fn) {
  const Project = mongoose.model('Project')
  // Check only when it is a new project or when name field is modified
  if (this.isNew || this.isModified('name')) {
    // Check that owner does not already have a project with the same name
    Project.find({ name, owner: this.owner }).exec((err, projects) => {
      fn(!err && projects.length === 0)
    })
  } else fn(true)
}, 'Owner already has a project with that name.')

/**
 * Pre-remove hook
 */

// ProjectSchema.pre('remove', (next) => {
//   next()
// })

/**
 * Methods
 */

ProjectSchema.methods = {

  /**
   * Add collaborator
   *
   * @param {Object|String} user - User object of user to add as collaborator
   * @api private
   */

  addCollaborator: function (user) {
    if (this.collaborators && find(this.collaborators, {_id: user._id})) {
      throw new Error('Collaborator already exists')
    }
    this.collaborators.push(user)
    return this.save()
  },

  /**
   * Remove collaborator
   * @param {String} userId - Id of user to remove from collaborators
   */

  removeCollaborator: function (userId) {
    console.log('remove colab called with:', userId)
    const index = this.collaborators
      .map(user => JSON.stringify(user._id))
      .indexOf(JSON.stringify(userId))
    console.log('collab to delete', this.collaborators.splice(index, 1))
    if (~index) this.collaborators.splice(index, 1)
    else throw new Error('Collaborator not found')
    return this.save()
  }
}

/**
 * Statics
 */

ProjectSchema.statics = {

  /**
   * Find project by id
   *
   * @param {ObjectId} id
   * @api private
   */

  load: function (find) {
    return this.findOne(find)
      .populate('owner', 'name email username avatar_url')
      .populate('collaborators', 'name email username avatar_url')
      .exec()
  },

  /**
   * List projects
   *
   * @param {Object} options
   * @api private
   */

  list: function (options) {
    const criteria = options.criteria || {}
    const page = options.page || 0
    const limit = options.limit || 30
    return this.find(criteria)
      .populate('collaborators', 'name username email avatar_url')
      .populate('owner', 'name username email avatar_url')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(limit * page)
      .exec()
  }
}

mongoose.model('Project', ProjectSchema)
