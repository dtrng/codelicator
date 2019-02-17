const fs = require('fs')
      console.log('\033[2J');

const template = process.argv[2]
const filePath = process.argv[3]
const filename = filePath.split('/').pop().split('.').shift()

let stdinListener = null
const stdin = process.stdin
if (process.stdin.isTTY)
  stdin.setRawMode(true)
stdin.resume()
stdin.setEncoding('utf8')
stdin.on('data', key => {
  if ( key === '\u0003' ) {
    process.exit();
  }
  if (stdinListener) {
    stdinListener(key)
  }
})

fs.readFile(template, (err, data) => {
  if (err) {
    console.log('err', err.message)
  } else {
    const content = data.toString()
    console.log(content)
    const parsed = parseEditingPoints(content)
    // console.log((parsed))
    // console.log(print(parsed))

    const indexes = extractIndexes(parsed)
    //console.log(indexes)

    parsed.filter(x => x.index === 'filename').forEach(x => x.value = filename)

    readAll(indexes.filter(x => +x === +x).filter(x => x), 0, parsed)
      .then(() => {
        console.log('\033[2J');
        console.log(print(parsed))
        fs.writeFileSync(filePath, print(parsed))
        process.exit()
      })
      .catch(err => console.log(err.message))
  }
})


function readAll (indexes, i, parsed) {
  console.log('\033[2J');
  console.log(print(parsed, indexes[i]))
  const apply = res => 
    parsed
      .filter(x => x.index === indexes[i])
      .forEach(x => x.value = res)
  return readInput(apply, parsed, indexes[i])
    .then(res => {
      debugger
      apply(res)
      if (i < indexes.length - 1) {
        return readAll(indexes, i + 1, parsed)
      }
      return parsed
    })
}

function readInput (apply, parsed, activeIndex) {
  return new Promise((resolve, reject) => {
    let data = ''
    stdinListener = (key) => {
      console.log(key.charCodeAt(0))
      if (key === '\u000D') {
        stdinListener = null
        resolve(data)
      } else if (key === '\u007F') {
        data = data.substring(0, data.length-1)
      } else {
        data += key
      }
      apply(data)
      console.log('\033[2J');
      console.log(print(parsed, activeIndex))
    }
  })
}

function extractIndexes(structure) {
    const indexes = structure
      .filter(x => x.index)
      .reduce((indexes, x) => {
        indexes[x.index] = x.index
        return indexes
      }, {})
  return Object.keys(indexes)
}

function parseEditingPoints(fileContent) {
  const structure = fileContent.split('').reduce((acc, char, i) => {
    const curr = acc.parts[acc.parts.length - 1]
    if (acc.state === 'content') {
      if (char === '$') {
        acc.state = 'candidate'
      } else {
        curr.start = truthyOrZero(curr.start) ? curr.start : i
        curr.end = i
      }
    } else if (acc.state === 'candidate') {
      if (char === '{') {
        acc.state = 'editPoint'
        acc.parts.push({type: 'editPoint'})
      } else {
        acc.state = 'content'
        curr.end = i
      }
    } else if (acc.state === 'editPoint') {
      if (char === '}') {
        acc.state = 'content'
        acc.parts.push({type: 'content'})
      } else {
        curr.start = truthyOrZero(curr.start) ? curr.start : i
        curr.end = i
      }
    } else {
      throw new Error('bad state')
    }
    return acc
  }, {parts: [{type: 'content'}], state: 'content'})
  
  return structure.parts.map(x => {
    if (x.type === 'content') {
      return parseContent(x, fileContent)
    }
    return parseEditingPoint(x, fileContent)
  })
}

function parseEditingPoint(p, fileContent) {
  const [index, placeholder = ''] = fileContent.substring(p.start, p.end + 1).split(',')
  return {...p, index, placeholder: placeholder.trim()}
}

function print(structure, activeIndex) {
  return structure.map(x => {
    if (x.type === 'content') {
      return x.content
    }
    if (x.type === 'editPoint') {
      if (activeIndex && x.index === activeIndex) {
        return x.value ? x.value + '\u2588' : '\u2588' + x.placeholder
      }
      return x.value || x.placeholder
    }
  }).join('')
}

function parseContent(p, fileContent) {
  return {...p, content: fileContent.substring(p.start, p.end + 1)}
}

function truthyOrZero (x) {
  return x === 0 || x 
}


