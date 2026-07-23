import axios from 'axios'

export default (_context, inject) => {
  const client = axios.create({
    baseURL: process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : ''
  })

  client.$get = (url, config) => client.get(url, config).then((response) => response.data)
  client.$post = (url, data, config) => client.post(url, data, config).then((response) => response.data)
  client.$put = (url, data, config) => client.put(url, data, config).then((response) => response.data)
  client.$delete = (url, config) => client.delete(url, config).then((response) => response.data)

  inject('axios', client)
}
