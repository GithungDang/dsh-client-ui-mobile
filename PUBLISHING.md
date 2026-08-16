# 发布清单（Publishing Checklist）

发布 `dsh-client-ui-mobile` 到 npm 前逐项核对。本机 npm registry 指向 npmmirror 镜像，
**发布必须显式指定官方 registry**，否则包会发到镜像站。

## 发布前

- [ ] `git status` 干净，`git log` 提交信息正确
- [ ] `pnpm typecheck` 通过（`tsc --noEmit`）
- [ ] `pnpm build` 通过，无 tsdown 弃用警告
- [ ] `pnpm pack --dry-run` 产物只包含：`lib/`、`cordis.patch.yml`、`README.md`、`LICENSE`、`package.json`
- [ ] `package.json` 检查：
  - `name`：`dsh-client-ui-mobile`（npm 上已验证可用）
  - `version`：已按 semver 递增（当前 0.1.0）
  - `description` / `keywords` / `license: MIT` 齐全
  - `repository` 字段：创建 GitHub 仓库后补上（`"repository": { "type": "git", "url": "git+https://github.com/<you>/dsh-client-ui-mobile.git" }`）
  - `dsh.client` / `dsh.bundle` manifest 未丢失
- [ ] 创建 GitHub 仓库（与 npm 包同名 `dsh-client-ui-mobile`），设置 description + topics
- [ ] git 身份改为你自己的 `user.name` / `user.email`
- [ ] LICENSE 版权行改为你的名字/组织

## 发布

```sh
# 用官方 registry（本机默认是 npmmirror 镜像，不要直接 pnpm publish）
pnpm publish --registry https://registry.npmjs.org

# 打 tag
git tag v0.1.0 && git push origin main --tags
```

## 发布后验证

```sh
npm view dsh-client-ui-mobile version          # 确认版本上去了
npm view dsh-client-ui-mobile dist.tarball     # 确认 tarball 地址

# 真实安装验证（在任意目录，用官方 registry）
dsh plugin --profile mobile-test add dsh-client-ui-mobile
# 或手动验证 tarball 内容
npm pack dsh-client-ui-mobile
```

## 维护约定

- 版本语义：功能修复 → patch；新功能 → minor；破坏性变更 → major（0.x 阶段可按 rc 递增）
- 每次发布前重跑本清单；`prepublishOnly` 会自动执行 `typecheck + build`
- `lib/` 不进 git（`prepare` 脚本在安装时自动构建，发布时 `prepublishOnly` 构建）
