'use strict'

/*!
 * Module dependencies.
 */

// Note: We can require users, projects and other cotrollers because we have
// set the NODE_PATH to be ./app/controllers (package.json # scripts # start)

const users = require('../app/controllers/users')
const userCtrl = require('../app/controllers/user')
const projects = require('../app/controllers/projects')
const home = require('../app/controllers/home')
const auth = require('./middlewares/authorization')
const config = require('./config')
/**
 * Route middlewares
 */

const userAuth = [auth.requiresLogin, auth.user.hasAuthorization]
const projectAuth = [auth.requiresLogin, auth.project.hasAuthorization]

/**
 * Expose routes
 */

module.exports = function (app, passport) {
  // Auth
  app.post('/signup', users.create)
  app.post('/login', loginReq)
  app.put('/login', loginReq)
  app.put('/logout', userCtrl.logout)
  app.get('/stateToken', userCtrl.getStateToken)
  app.put('/auth', userCtrl.providerAuth)

  //User routes
  app.get('/user', userCtrl.index)
  app.get('/user/projects', userCtrl.projects)
  app.put('/user/avatar', userCtrl.avatar)
  // app.post('/user/projects', userCtrl.createProject)
  app.get('/users/search', users.search)

  //Users routes
  app.param('username', users.load)
  app.get('/users', users.index)
  app.get('/users/:username', users.show)
  app.put('/users/:username', users.update)
  app.delete('/users/:username', users.destroy)
  app.put('/users/:username/avatar', userAuth, userCtrl.avatar)
  app.post('/users/:username/avatar', userAuth, userCtrl.avatar)

  //Projects routes
  app.param('owner', users.load)
  app.param('projectName', projects.load)
  app.param('collaborator', users.loadCollaborator)

  /**
   * @api {get} /projects Get Projects
   * @apiDescription Get a list of all public projects
   * @apiName get
   * @apiGroup Project
   * @apiParam {String} [name] Name of Project.
   * @apiSuccess {Array} projects List of projects
   */
  app.get('/projects', projects.index)

  /**
   * @api {get} /projects/:owner/:project Get Project
   * @apiDescription Get a project's data
   * @apiName get project
   * @apiGroup Project
   * @apiParam {String} [name] Name of Project.
   * @apiSuccess {Object} project Project's data
   */
  app.get('/projects/:owner/:projectName', projects.get)

  /**
   * @api {put} /projects/:owner/:project Update project
   * @apiDescription Update a project's data
   * @apiName update project
   * @apiGroup Project
   * @apiParam {String} [name] Name of Project
   * @apiSuccess {Object} project Project's data
   */
  app.put('/projects/:owner/:projectName', projects.update)

  /**
   * @api {delete} /projects/:owner/:project Delete Project
   * @apiDescription Delete a project
   * @apiName get
   * @apiGroup Project
   * @apiParam {String} [name] Name of Project
   * @apiSuccess {Object} message Success message
   */
  app.delete('/projects/:owner/:projectName', projects.destroy)

  /**
   * @api {get} /projects/:owner/:project/collaborators Get Projects
   * @apiDescription Get a list of all public projects
   * @apiName get
   * @apiGroup Project
   * @apiParam {String} [name] Name of Project
   * @apiSuccess {Array} collaborators List of project collaborators
   */
  app.get('/projects/:owner/:projectName/collaborators', projects.getCollaborators)

  /**
   * @api {get} /projects/:owner/:project/collaborators/:collaborator Add Collaborator
   * @apiDescription Add a collaborator to project
   * @apiName get
   * @apiGroup Project
   * @apiParam {String} [name] Name of Project
   * @apiSuccess {Array} project Project data
   */
  app.put('/projects/:owner/:projectName/collaborators/:collaborator', projects.addCollaborator)

  /**
   * @api {delete} /projects/:owner/:project/collaborators/:collaborator Remove Collaborator
   * @apiDescription Remove a collaborator from project
   * @apiName get
   * @apiGroup Project
   * @apiParam {String} [name] Name of Project
   * @apiSuccess {Array} projects List of projects
   */
  app.delete('/projects/:owner/:projectName/collaborators/:collaborator', projectAuth, projects.removeCollaborator)


  //--------------------------- Users routes ---------------------------------//

  /**
   * @api {get} /users/:owner/projects Get Users Projects
   * @apiDescription Get a list of all of users owned and collaborated on projects
   * @apiName get projects
   * @apiGroup Users
   * @apiParam {String} [owner] Username for which to load projects
   * @apiSuccess {Array} projects Projects list
   */
  app.get('/users/:owner/projects', projects.index)

  /**
   * @api {post} /users/:owner/projects Create Project
   * @apiDescription Create a new project with provided owner
   * @apiName add project
   * @apiGroup Users
   * @apiParam {String} [owner] Username of new project owner
   * @apiSuccess {Object} project New Project
   */
  app.post('/users/:owner/projects', projects.create)

  /**
   * @api {get} /users/:owner/projects/:project Get a project
   * @apiDescription Get a project's data
   * @apiName get project
   * @apiGroup Users
   * @apiParam {String} [owner] Username of project owner
   * @apiSuccess {Object} project Project data
   */
  app.get('/users/:owner/projects/:projectName', projects.get)

  /**
   * @api {get} /users/:owner/projects/:project Get a project
   * @apiDescription Get a project's data
   * @apiName get project
   * @apiGroup Users
   * @apiParam {String} [owner] Username of project owner
   * @apiSuccess {Object} project Project data
   */
  app.put('/users/:owner/projects/:projectName', projects.update)

  /**
   * @api {get} /users/:owner/projects/:project/collaborators Get a project
   * @apiDescription Get a project's data
   * @apiName get project
   * @apiGroup Users
   * @apiParam {String} [owner] Username of project owner
   * @apiSuccess {Object} project Project data
   */
  app.get('/users/:owner/projects/:projectName/collaborators', projects.getCollaborators)

  /**
   * @api {put} /users/:owner/projects/:project/collaborators/:collaborator Add collaborator
   * @apiDescription Add a collaborator to project
   * @apiName get project
   * @apiGroup Users
   * @apiParam {String} [owner] Username of project owner
   * @apiSuccess {Object} project Project data
   */
  app.put('/users/:owner/projects/:projectName/collaborators/:collaborator', projects.addCollaborator)

  /**
   * @api {delete} /users/:owner/projects/:project/collaborators Remove collaborator
   * @apiDescription Remove a collaborator from a project
   * @apiName get project
   * @apiGroup Users
   * @apiParam {String} [owner] Username of project owner
   * @apiSuccess {Object} project Project data
   */
  app.delete('/users/:owner/projects/:projectName/collaborators/:collaborator', projects.removeCollaborator)

  /**
   * @api {delete} /users/:owner/projects/:project Delete a project
   * @apiDescription Delete/Remove a project
   * @apiName delete project
   * @apiGroup Users
   * @apiParam {String} [owner] Username of project owner
   * @apiSuccess {Object} project Project data
   */
  app.delete('/users/:owner/projects/:projectName', projects.destroy)

  app.get('/', home.index)

  /**
   * Error handling
   */

  app.use((err, req, res, next) => {
    // treat as 404
    if (err.message
      && (~err.message.indexOf('not found')
      || (~err.message.indexOf('Cast to ObjectId failed')))) {
      return next()
    }

    console.error(err.stack)

    if (err.stack.includes('ValidationError')) {
      res.status(422).render('422', { error: err.stack })
      return
    }

    // error page
    // res.status(500).render('500', { error: err.stack })

    // 500 Response
    res.status(500).json({
      message: 'Error.',
      stack: err.stack,
      code: 500
    })
  })

  // assume 404 since no middleware responded
  app.use((req, res) => {
    res.status(404).json({
      message: 'Invalid request.',
      status: 'NOT_FOUND',
      code: 404
    })
  })

  function loginReq(req, res, next) {
    passport.authenticate('local', (error, user, info) => {
      if(error || !user){
        console.log({ message: 'Error with login request.', error })
        return res.status(400).json(info || err)
      }
      req.user = user
      userCtrl.login(req, res, next)
    })(req, res, next)
  }
}
