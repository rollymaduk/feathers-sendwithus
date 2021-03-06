import Debug from 'debug';
import isArray from "lodash/isArray"

const debug = Debug('feathers-sendwithus:service');

export default function createService({ api, templateMapper,batchOpts }) {
  const {path='/api/v1/send',method='POST',chunkSize=10}=batchOpts || {}

  return Object.create({
    setup(app) {
      this.app = app;
    },

    create(params) {
      debug(`create: ${JSON.stringify(params)}`)
      const param_template = (isArray(params))?params[0].template:params.template
      return templateMapper(param_template)
        .then(template =>
          new Promise((resolve, reject) => {
            const context = { resolve, reject };
            const data = isArray(params) ? 
                  params.map(d =>({
                    body: Object.assign({}, d, { template }),
                    path,
                    method,
                  })
                ) : Object.assign({}, params, { template });
        
            if (isArray(data)) {
              // TODO: Refactor
              for (let i = 0; i < data.length; i+=chunkSize) {
                const chunk = data.slice(i, i + chunkSize);
                api.batch(chunk, (err, result) => {
                  if (err) { 
                    reject(err);
                    return;
                  }
                    
                  resolve(result);
                });                    
              }
            }
            else {
              api.send(data,  (err, result) => {
                if (err) { 
                  reject(err);
                  return;
                }

                resolve(result);
              });
            }
          })
        );

    },
  });
}

