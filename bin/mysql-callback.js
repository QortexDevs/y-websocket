const mysql = require('mysql2')

const MYSQL_HOST = process.env.MYSQL_HOST || 'localhost'
const MYSQL_USER = process.env.MYSQL_USER || 'root'
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || ''
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'database'
const MYSQL_TABLE = process.env.MYSQL_TABLE || 'table'
const MYSQL_CONTENT_FIELD = process.env.MYSQL_CONTENT_FIELD || 'content'
const MYSQL_KEY_FIELD = process.env.MYSQL_KEY_FIELD || 'id'
const MYSQL_PORT = process.env.MYSQL_PORT || 3306

const CALLBACK_TIMEOUT = process.env.CALLBACK_TIMEOUT || 5000
const CALLBACK_OBJECTS = process.env.CALLBACK_OBJECTS ? JSON.parse(process.env.CALLBACK_OBJECTS) : {}

exports.isCallbackSet = true

const connection = mysql.createConnection({
  host: MYSQL_HOST,
  user: MYSQL_USER,
  database: MYSQL_DATABASE,
  password: MYSQL_PASSWORD,
  port: MYSQL_PORT
})

connection.connect(function (err) {
  if (err) {
    return console.error('MySQL connection error: ' + err.message)
  } else {
    console.log('MySQL connection success')
  }
})

/**
 * @param {Uint8Array} update
 * @param {any} origin
 * @param {WSSharedDoc} doc
 */
exports.callbackHandler = (update, origin, doc) => {
  const room = doc.name
  const dataToSend = {
    room: room,
    data: {}
  }
  const sharedObjectList = Object.keys(CALLBACK_OBJECTS)
  sharedObjectList.forEach(sharedObjectName => {
    const sharedObjectType = CALLBACK_OBJECTS[sharedObjectName]
    dataToSend.data[sharedObjectName] = {
      type: sharedObjectType,
      content: getContent(sharedObjectName, sharedObjectType, doc)
    }
  })
  callbackRequest(CALLBACK_TIMEOUT, dataToSend)
}

/**
 * @param {number} timeout
 * @param {Object} data
 */
const callbackRequest = (timeout, dataToSend) => {
  const dataList = Object.keys(dataToSend.data)
  dataList.forEach(data => {
    const sharedObject = dataToSend.data[data]
    connection.query('UPDATE ' + MYSQL_TABLE + ' SET ' + MYSQL_CONTENT_FIELD + '=? WHERE ' + MYSQL_KEY_FIELD + '=?', [JSON.stringify(sharedObject.content), dataToSend.room], function (err, doc) {
      if (err) {
        return console.log(err)
      }
    })
  })
}

/**
 * @param {string} objName
 * @param {string} objType
 * @param {WSSharedDoc} doc
 */
const getContent = (objName, objType, doc) => {
  switch (objType) {
    case 'Array': return doc.getArray(objName).toJSON()
    case 'Map': return doc.getMap(objName).toJSON()
    case 'Text': return doc.getText(objName).toJSON()
    case 'XmlFragment': return doc.getXmlFragment(objName).toJSON()
    case 'XmlElement': return doc.getXmlElement(objName).toJSON()
    case 'Delta': return doc.getText(objName).toDelta()
    default : return {}
  }
}
