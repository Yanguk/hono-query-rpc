# GitHub Actions를 사용하여 패키지 게시 및 설치

GitHub Actions에서 워크플로를 구성하여 GitHub Packages에서 자동으로 패키지를 게시 또는 설치할 수 있습니다.

<!-- 2148AF7B-5FF8-4B28-A808-D692FEE2225A -->

## GitHub Actions를 사용한 GitHub Packages 정보

GitHub Actions는 코드를 저장하고 끌어오기 요청 및 이슈에 대해 공동 작업하는 곳과 동일한 위치에서 소프트웨어 개발 워크플로를 자동화하는 GitHub의 기능 모음입니다. 작업이라는 개별 작업을 작성하고 결합하여 사용자 지정 워크플로를 만들 수 있습니다. GitHub Actions를 사용하면 리포지토리에서 직접 엔드투엔드 CI(연속 통합) 및 CD(지속적인 배포) 기능을 빌드할 수 있습니다. 자세한 내용은 [워크플로 작성](/ko/actions/learn-github-actions)을(를) 참조하세요.

워크플로의 일부로 패키지를 게시하거나 설치하여 리포지토리의 CI 및 CD 기능을 확장할 수 있습니다.

### 세분화된 권한을 사용하여 패키지 레지스트리에 대해 인증

일부 GitHub Packages 레지스트리는 세분화된 권한을 지원합니다. 즉, 패키지의 범위를 사용자 또는 조직으로 지정하거나 리포지토리에 연결하도록 선택할 수 있습니다. 세분화된 권한을 지원하는 레지스트리의 목록은 [GitHub 패키지에 대한 사용 권한 정보](/ko/packages/learn-github-packages/about-permissions-for-github-packages#granular-permissions-for-userorganization-scoped-packages)을(를) 참조하세요.

세분화된 권한을 지원하는 레지스트리는 GitHub Actions 워크플로가 personal access token을(를) 사용하여 레지스트리에 인증하는 경우, `GITHUB_TOKEN`로 워크플로를 업데이트하는 것을 권장합니다. personal access token로 레지스트리에 인증하는 워크플로를 업데이트하는 방법에 대한 지침은 [GitHub Actions를 사용하여 패키지 게시 및 설치](/ko/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions#upgrading-a-workflow-that-accesses-a-registry-using-a-personal-access-token)를 참조하세요.

> \[!NOTE]
> GitHub Actions 워크플로에서 REST API를 사용하여 패키지를 삭제하고 복원하는 기능은 현재 공개 미리 보기 버전이며 변경될 수 있습니다.

토큰이 패키지에 대해 `admin` 권한이 있는 경우, GitHub Actions 워크플로에서 `GITHUB_TOKEN`로 REST API를 사용하여 패키지를 삭제하거나 복원할 수 있습니다. 워크플로를 사용하여 패키지를 게시하는 리포지토리와 패키지에 명시적으로 연결한 리포지토리에는 리포지토리의 패키지에 대한 `admin` 권한이 자동으로 부여됩니다.

`GITHUB_TOKEN`에 대한 자세한 내용은 [워크플로에서 인증에 GITHUB\\\_TOKEN 사용](/ko/actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow)을(를) 참조하세요. 작업에서 레지스트리를 사용하는 모범 사례에 대한 자세한 내용은 [안전 사용 참조](/ko/actions/security-guides/security-hardening-for-github-actions#considering-cross-repository-access)를 참조하세요.

### 리포지토리 범위 권한을 사용하여 패키지 레지스트리에 대해 인증

일부 GitHub Packages 레지스트리는 리포지토리 범위 권한만 지원하고 세분화된 권한은 지원하지 않습니다. 이러한 레지스트리의 목록은 [GitHub 패키지에 대한 사용 권한 정보](/ko/packages/learn-github-packages/about-permissions-for-github-packages#permissions-for-repository-scoped-packages)을(를) 참조하세요.

워크플로에서 세부적인 권한을 지원하지 않는 GitHub Packages 레지스트리에 액세스하려면 GitHub Actions를 사용하도록 설정할 때 해당 GitHub를 리포지토리에 자동으로 만드는 `GITHUB_TOKEN`을 사용하는 것이 좋습니다. `contents` 범위에 대한 읽기 권한을 부여하고 `packages` 범위에 대한 쓰기 권한을 부여하려면 워크플로 파일에서 이 액세스 토큰에 대한 사용 권한을 설정해야 합니다. 포크의 경우 `GITHUB_TOKEN`은 부모 리포지토리에 대한 읽기 권한이 부여됩니다. 자세한 내용은 [워크플로에서 인증에 GITHUB\\\_TOKEN 사용](/ko/actions/security-guides/automatic-token-authentication)을(를) 참조하세요.

`${{ secrets.GITHUB_TOKEN }}` 컨텍스트를 사용하여 워크플로 파일에서 `GITHUB_TOKEN`을 참조할 수 있습니다. 자세한 내용은 [워크플로에서 인증에 GITHUB\\\_TOKEN 사용](/ko/actions/security-guides/automatic-token-authentication)을(를) 참조하세요.

## 권한 및 패키지 액세스 정보

### 사용자 또는 조직으로 범위가 지정된 패키지

세분화된 권한을 지원하는 레지스트리를 사용하면 사용자가 조직 수준에서 패키지를 독립적인 리소스로 만들고 관리할 수 있습니다. 패키지는 조직 또는 개인 계정으로 범위를 지정할 수 있으며 리포지토리 권한과 별도로 각 패키지에 대한 액세스를 사용자 지정할 수 있습니다.

세분화된 권한을 지원하는 레지스트리에 액세스하는 모든 워크플로는 personal access token 대신 `GITHUB_TOKEN`을(를) 사용해야 합니다. 보안 모범 사례에 대한 자세한 내용은 [안전 사용 참조](/ko/actions/security-guides/security-hardening-for-github-actions#using-secrets)을(를) 참조하세요.

### 리포지토리로 범위가 지정된 패키지

GitHub Actions를 사용하면 GitHub가 리포지토리에 GitHub 앱을 설치합니다. `GITHUB_TOKEN` 비밀은 GitHub 앱 설치 액세스 토큰입니다. 설치 액세스 토큰을 사용하여 리포지토리에 설치된 GitHub 앱을 대신하여 인증할 수 있습니다. 토큰의 권한은 워크플로를 포함하는 리포지토리로 제한됩니다. 자세한 내용은 [워크플로에서 인증에 GITHUB\\\_TOKEN 사용](/ko/actions/security-guides/automatic-token-authentication#about-the-github_token-secret)을(를) 참조하세요.

GitHub Packages를 사용하면 GitHub Actions 워크플로에서 사용할 수 있는 `GITHUB_TOKEN`을 통해 패키지를 푸시하고 풀할 수 있습니다.

## 워크플로를 통해 수정된 패키지에 대한 기본 권한 및 액세스 설정

세분화된 권한을 지원하는 레지스트리의 패키지의 경우 워크플로를 통해 패키지를 만들거나 설치, 수정 또는 삭제할 때 관리자가 워크플로에 액세스할 수 있도록 하기 위해 사용되는 몇 가지 기본 권한 및 액세스 설정이 있습니다. 액세스 설정을 조정할 수도 있습니다. 세분화된 권한을 지원하는 레지스트리의 목록은 [GitHub 패키지에 대한 사용 권한 정보](/ko/packages/learn-github-packages/about-permissions-for-github-packages#granular-permissions-for-userorganization-scoped-packages)을(를) 참조하세요.

예를 들어 워크플로가 `GITHUB_TOKEN`을 사용하여 패키지를 만드는 경우 기본적으로 다음이 적용됩니다.

* 패키지는 워크플로가 실행되는 리포지토리의 표시 여부 및 권한 모델을 상속합니다.
* 워크플로를 실행하는 리포지토리 관리자는 패키지가 만들어지면 패키지의 관리자가 됩니다.

다음은 패키지를 관리하는 워크플로에 대해 기본 사용 권한이 작동하는 방식에 대한 더 많은 예입니다.

| GitHub Actions 워크플로 작업 | 기본 권한 및 액세스                                                                                                                                                                                                                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 기존 항목 추가               | - 패키지가 퍼블릭인 경우 모든 리포지토리에서 실행되는 모든 워크플로에서 패키지를 다운로드할 수 있습니다. <br> - 패키지가 내부용인 경우 엔터프라이즈 계정이 소유한 리포지토리에서 실행되는 모든 워크플로가 패키지를 다운로드할 수 있습니다. 엔터프라이즈 소유 조직의 경우 엔터프라이즈의 모든 리포지토리를 읽을 수 있습니다. <br> - 패키지가 비공개인 경우 해당 패키지에 대한 읽기 권한이 부여된 리포지토리에서 실행되는 워크플로만 패키지를 다운로드할 수 있습니다. 프라이빗 패키지에 퍼블릭 리포지토리 액세스 권한을 부여하는 경우 리포지토리의 포크가 프라이빗 패키지에 액세스할 수 있습니다. <br> |
| 기존 패키지에 새 버전 업로드       | - 패키지가 프라이빗, 내부용 또는 퍼블릭인 경우 해당 패키지에 대한 쓰기 권한이 부여된 리포지토리에서 실행되는 워크플로만 패키지에 새 버전을 업로드할 수 있습니다.                                                                                                                                                                                                                                                     |
| 패키지 또는 패키지 버전 삭제       | - 패키지가 프라이빗, 내부용 또는 퍼블릭인 경우 관리자 권한이 부여된 리포지토리에서 실행되는 워크플로만 기존 버전의 패키지를 삭제할 수 있습니다.                                                                                                                                                                                                                                                               |

패키지에 대한 액세스를 보다 세부적으로 조정하거나 일부 기본 권한 동작을 조정할 수도 있습니다. 자세한 내용은 [패키지의 액세스 제어 및 표시 여부 구성](/ko/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility)을(를) 참조하세요.

## 작업을 사용하여 패키지 게시

GitHub Actions를 사용하여 CI(연속 통합) 흐름의 일부로 패키지를 자동으로 게시할 수 있습니다. CD(지속적인 배포)에 대한 이 접근 방식을 사용하면 코드가 품질 표준을 충족하는 경우 새 패키지 버전 만들기를 자동화할 수 있습니다. 예를 들어 개발자가 코드를 특정 분기에 푸시할 때마다 CI 테스트를 실행하는 워크플로를 만들 수 있습니다. 테스트가 통과하면 워크플로에서 새 패키지 버전을 GitHub Packages에 게시할 수 있습니다.

구성 단계는 패키지 클라이언트에 따라 다릅니다. GitHub Actions의 워크플로 구성에 대한 일반적인 정보는 [워크플로 작성](/ko/actions/using-workflows)을(를) 참조하세요.

다음 예제에서는 GitHub Actions를 사용하여 앱을 빌드하고 자동으로 Docker 이미지를 만들어 GitHub Packages에 게시하는 방법을 보여 줍니다. 관련 설정은 코드에 설명되어 있습니다. 워크플로의 각 요소에 대한 자세한 내용은 [GitHub Actions에 대한 워크플로 구문](/ko/actions/using-workflows/workflow-syntax-for-github-actions)을(를) 참조하세요.

리포지토리에 새 워크플로 파일(예: `.github/workflows/deploy-image.yml`)을 만들고 다음 YAML을 추가합니다.

> \[!NOTE]
>
> * GitHub에서 인증되지 않은 작업을 사용하는 워크플로입니다. 타사에서 제공하며 별도의 서비스 약관, 개인 정보 보호 정책 및 지원 문서가 적용되는 작업입니다.
> * GitHub은(는) 커밋 SHA에 작업을 고정하는 것을 권장합니다. 최신 버전을 얻으려면 SHA를 업데이트해야 합니다. 태그 또는 분기를 참조할 수도 있지만 경고 없이 작업이 변경될 수 있습니다.

```yaml annotate copy
#
name: Create and publish a Docker image

# Configures this workflow to run every time a change is pushed to the branch called `release`.
on:
  push:
    branches: ['release']

# Defines two custom environment variables for the workflow. These are used for the Container registry domain, and a name for the Docker image that this workflow builds.
env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

# There is a single job in this workflow. It's configured to run on the latest available version of Ubuntu.
jobs:
  build-and-push-image:
    runs-on: ubuntu-latest
    # Sets the permissions granted to the `GITHUB_TOKEN` for the actions in this job.
    permissions:
      contents: read
      packages: write
      attestations: write
      id-token: write
      #
    steps:
      - name: Checkout repository
        uses: actions/checkout@v5
      # Uses the `docker/login-action` action to log in to the Container registry registry using the account and password that will publish the packages. Once published, the packages are scoped to the account defined here.
      - name: Log in to the Container registry
        uses: docker/login-action@65b78e6e13532edd9afa3aa52ac7964289d1a9c1
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      # This step uses [docker/metadata-action](https://github.com/docker/metadata-action#about) to extract tags and labels that will be applied to the specified image. The `id` "meta" allows the output of this step to be referenced in a subsequent step. The `images` value provides the base name for the tags and labels.
      - name: Extract metadata (tags, labels) for Docker
        id: meta
        uses: docker/metadata-action@9ec57ed1fcdbf14dcef7dfbe97b2010124a938b7
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
      # This step uses the `docker/build-push-action` action to build the image, based on your repository's `Dockerfile`. If the build succeeds, it pushes the image to GitHub Packages.
      # It uses the `context` parameter to define the build's context as the set of files located in the specified path. For more information, see [Usage](https://github.com/docker/build-push-action#usage) in the README of the `docker/build-push-action` repository.
      # It uses the `tags` and `labels` parameters to tag and label the image with the output from the "meta" step.
      - name: Build and push Docker image
        id: push
        uses: docker/build-push-action@f2a1d5e99d037542a71f64918e516c093c6f3fc4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
      
      # This step generates an artifact attestation for the image, which is an unforgeable statement about where and how it was built. It increases supply chain security for people who consume the image. For more information, see [Using artifact attestations to establish provenance for builds](/actions/security-guides/using-artifact-attestations-to-establish-provenance-for-builds).
      - name: Generate artifact attestation
        uses: actions/attest@v4
        with:
          subject-name: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME}}
          subject-digest: ${{ steps.push.outputs.digest }}
          push-to-registry: true
      
```

이 새 워크플로는 리포지토리에서 `release`라고 명명된 분기에 변경 사항을 푸시할 때마다 자동으로 실행됩니다. **작업** 탭에서 진행 상황을 볼 수 있습니다.

워크플로가 완료되고 몇 분 후에 새 패키지가 리포지토리에 표시됩니다. 사용할 수 있는 패키지를 찾으려면 [패키지 보기](/ko/packages/learn-github-packages/viewing-packages#viewing-a-repositorys-packages)을(를) 참조하세요.

## 작업을 사용하여 패키지 설치

GitHub Actions를 사용하여 CI 흐름의 일부로 패키지를 설치할 수 있습니다. 예를 들어 개발자가 코드를 끌어오기 요청에 푸시할 때마다 워크플로가 GitHub Packages에서 호스트하는 패키지를 다운로드하고 설치하여 종속성을 처리하도록 워크플로를 구성할 수 있습니다. 그런 다음, 워크플로는 종속성이 필요한 CI 테스트를 실행할 수 있습니다.

`GITHUB_TOKEN`을 사용하는 경우 GitHub Actions를 통해 GitHub Packages에서 호스트되는 패키지를 설치하려면 최소한의 구성 또는 추가 인증이 필요합니다. 데이터 전송은 작업에서 패키지를 설치할 때도 무료입니다. 자세한 내용은 [GitHub 패키지 청구](/ko/billing/managing-billing-for-github-packages/about-billing-for-github-packages)을(를) 참조하세요.

구성 단계는 패키지 클라이언트에 따라 다릅니다. GitHub Actions의 워크플로 구성에 대한 일반적인 정보는 [워크플로 작성](/ko/actions/using-workflows)을(를) 참조하세요.

## personal access token을(를) 사용하여 레지스트리에 액세스하는 워크플로 업그레이드

GitHub Packages은(는) 워크플로에서 쉽고 안전한 인증을 위해 `GITHUB_TOKEN`을 지원합니다. 세분화된 권한을 지원하는 레지스트리를 사용하고 워크플로가 personal access token을(를) 사용하여 레지스트리에 대해 인증하는 경우, `GITHUB_TOKEN`을 사용하도록 워크플로를 업데이트하는 것이 좋습니다.

`GITHUB_TOKEN`에 대한 자세한 내용은 [워크플로에서 인증에 GITHUB\\\_TOKEN 사용](/ko/actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow)을(를) 참조하세요.

`repo` 범위의 personal access token (classic) 대신 `GITHUB_TOKEN`을 사용하면 워크플로가 실행되는 리포지토리에 대한 불필요한 액세스를 제공하는 수명이 긴 personal access token을(를) 사용할 필요가 없으므로 리포지토리의 보안이 강화됩니다. 보안 모범 사례에 대한 자세한 내용은 [안전 사용 참조](/ko/actions/security-guides/security-hardening-for-github-actions#using-secrets)을(를) 참조하세요.

1. 패키지 방문 페이지로 이동합니다.

2. 패키지가 워크플로에 액세스할 수 있도록 하려면 워크플로가 패키지에 저장되는 리포지토리를 추가해야 합니다. "작업 액세스 관리"에서 **리포지토리 추가**를 클릭하여 추가할 리포지토리를 검색합니다.
   패키지 설정 페이지의 "작업 액세스 관리" 섹션 ![스크린샷. "리포지토리 추가" 단추가 주황색 윤곽선으로 강조 표시됩니다.](/assets/images/help/package-registry/add-repository-button.png)

   > \[!NOTE]
   > 패키지 패키지의 설정 “작업 액세스 관리” 아래 **리포지토리 추가** 버튼 사용에 리포지토리를 추가하는 것은 패키지를 리포지토리에 연결하는 것과 다릅니다. 자세한 내용은 [패키지의 액세스 제어 및 표시 여부 구성](/ko/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility#ensuring-workflow-access-to-your-package) 및 [리포지토리를 패키지에 연결](/ko/packages/learn-github-packages/connecting-a-repository-to-a-package)을(를) 참조하세요.

3. 선택적으로 **역할** 드롭다운 메뉴를 사용하여 패키지에 대해 리포지토리에 부여할 기본 액세스 수준을 선택합니다.
   사용

4. 워크플로 파일을 엽니다. 레지스트리에 로그인하는 줄에서 personal access token을(를) `${{ secrets.GITHUB_TOKEN }}`으로 바꿉니다.

예를 들어 이 워크플로는 Container registry에 Docker 이미지를 게시하고 `${{ secrets.GITHUB_TOKEN }}`을 사용하여 인증합니다. 자세한 내용은 Docker 설명서에서 [자동화된 빌드 설정](https://docs.docker.com/docker-hub/builds/)을 참조하세요.

```yaml annotate copy
#
name: Demo Push

# This workflow runs when any of the following occur:
# - A push is made to a branch called `main` or `seed`
# - A tag starting with "v" is created
# - A pull request is created or updated
on:
  push:
    branches:
      - main
      - seed
    tags:
      - v*
  pull_request:
  # This creates an environment variable called `IMAGE_NAME ` with the value `ghtoken_product_demo`.
env:
  IMAGE_NAME: ghtoken_product_demo
#
jobs:
  # This pushes the image to GitHub Packages.
  push:
    runs-on: ubuntu-latest
    permissions:
      packages: write
      contents: read
      #
    steps:
      - uses: actions/checkout@v5

      - name: Build image
        run: docker build . --file Dockerfile --tag $IMAGE_NAME --label "runnumber=${GITHUB_RUN_ID}"

      - name: Log in to registry
        run: echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
        #
      - name: Push image
        run: |
          IMAGE_ID=ghcr.io/${{ github.repository_owner }}/$IMAGE_NAME

          # This changes all uppercase characters to lowercase.
          IMAGE_ID=$(echo $IMAGE_ID | tr '[A-Z]' '[a-z]')
          # This strips the git ref prefix from the version.
          VERSION=$(echo "${{ github.ref }}" | sed -e 's,.*/\(.*\),\1,')
          # This strips the "v" prefix from the tag name.
          [[ "${{ github.ref }}" == "refs/tags/"* ]] && VERSION=$(echo $VERSION | sed -e 's/^v//')
          # This uses the Docker `latest` tag convention.
          [ "$VERSION" == "main" ] && VERSION=latest
          echo IMAGE_ID=$IMAGE_ID
          echo VERSION=$VERSION
          docker tag $IMAGE_NAME $IMAGE_ID:$VERSION
          docker push $IMAGE_ID:$VERSION
```
