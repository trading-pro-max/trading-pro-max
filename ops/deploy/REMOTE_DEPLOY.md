# Remote Deployment Pack

Required runtime secrets:
- PROD_HOST
- PROD_USER
- PROD_PATH
- PROD_SSH_KEY

Code-side state:
- Dockerfile ready
- production compose ready
- nginx edge ready
- GitHub production promotion workflow ready
- health API ready
- deploy script ready
- rollback script ready

Final live switch depends only on real secrets and remote host access.
