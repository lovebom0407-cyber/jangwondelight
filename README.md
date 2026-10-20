# 장원 별밤학교 · Netlify 배포 패키지

2026-10-20 최신 Sites 25버전에서 내보낸 웹앱입니다.
화면, 이미지, 전체 소스, 빌드 완료본(`dist`), Netlify Functions 2개, 배포 설정을 함께 포함합니다.

## 서버 기능까지 함께 배포하기

**추천: 아래 CLI 방식 또는 GitHub 연동 방식으로 배포하세요.**
Netlify Drop에 `dist`만 끌어놓으면 정적 화면만 업로드됩니다. 기숙사 명단 배정과 최종 PDF 제출에는 Functions도 함께 배포되어야 합니다.

### 방법 1 — 빌드 완료본으로 빠르게 배포

1. ZIP을 풀고 `package.json`이 있는 폴더에서 터미널을 엽니다.
2. Node.js 24 LTS를 설치한 컴퓨터에서 아래 명령을 실행합니다.

```bash
npm ci
npx netlify-cli@latest login
npm run deploy:preview
```

Netlify CLI에서 본인 계정의 기존 사이트를 선택하거나 새 사이트를 만드세요.
생성된 미리보기 주소에서 입학·기숙사 배정·활동사진·PDF 저장을 확인한 뒤 실제 공개 주소에 반영합니다.

```bash
npm run deploy:prod
```

배포 명령은 포함된 `dist`와 `netlify/functions`를 함께 업로드합니다. `--no-build`는 이미 완료된 빌드를 사용한다는 뜻입니다.
소스를 수정했다면 `npm run build`를 먼저 실행한 다음 배포하세요.

### 방법 2 — GitHub에 올리고 Netlify에서 연결

1. 압축을 푼 파일을 GitHub 저장소의 루트에 올립니다. `src`·`public`·`server`·`netlify` 폴더와 `package.json`·`package-lock.json`·`netlify.toml`을 포함합니다.
2. Netlify에서 Git 저장소를 연결해 새 프로젝트를 만듭니다.
3. Base directory는 비워 두고, Build command는 `npm run build`, Publish directory는 `dist`로 설정합니다.
4. `netlify.toml`에 따라 서버 함수와 API 경로도 함께 배포됩니다. 별도의 API 키나 Firebase 설정은 필요하지 않습니다.

## 포함된 최신 변경

- 일반·저학년 룰렛 화면에서 확률·퍼센트 표시 제거. 실제 추첨 설정 유지.
- 성과공유 부스: ‘장원 별밤학교에 남기는 한마디!’ 패들렛 작성 미션과 링크.
- 5번 창의 마법 실습: 천문 사전지식 ZEP QUIZ 전용 인증샷 탭·촬영·보관, 최종 PDF 포함.
- 천체관측 설문 제거. 유치원·1·2·3학년 1부 / 4·5·6학년 2부 안내.
- 보물찾기 18:00까지, 수정한 지도와 안내도 포함.
- 학생 명단의 기숙사 배정 유지. 명단 밖 학생은 용기의 별을 제외한 세 기숙사에서 무작위 배정.
- Firebase 연동 없음. 사진·진행·보상은 이용하는 기기의 브라우저에 저장.

## 서버 함수

| 요청 경로 | 함수 | 역할 |
| --- | --- | --- |
| `/api/sorting` | `netlify/functions/sorting.mts` | 기존 명단을 기준으로 기숙사 배정. 명단 데이터는 서버 측에서만 사용 |
| `/api/portfolio` | `netlify/functions/portfolio.mts` | 보호자가 제출한 최종 PDF를 기존 Google Apps Script로 전달하고 저장 접수 확인 |

기존 Google Apps Script 배포 주소는 `src/data/driveUploadConfig.ts`에 유지했습니다.
지정한 Google Drive에 실제 파일을 저장하는 역할은 기존 Apps Script가 담당하므로 해당 배포와 Drive 권한이 정상이어야 합니다.
이 ZIP을 만드는 동안 실제 참가자 PDF를 업로드하거나 외부 게시글을 작성하지 않았습니다.
Apps Script 코드와 설정 설명도 `integrations/google-apps-script`에 포함했습니다.

Netlify의 요청 크기·실행시간에 맞춰 이 내보내기 버전의 PDF 제출은 **4MB 이하**로 제한하고 서버 요청 대기 시간을 조정했습니다.
큰 파일은 기기에 PDF로 저장한 뒤 선생님께 전달할 수 있습니다.
이 조정은 ZIP 안의 Netlify 버전에만 적용하며 기존 Sites 두 주소는 변경하지 않았습니다.

## 기록을 보존하려면

새 Netlify 주소는 기존 Sites 주소와 다른 브라우저 저장소를 사용합니다. 기존 주소의 사진·진행·쿠폰은 새 주소로 자동 이전되지 않습니다.
행사 중에는 한 주소를 정해 계속 사용하고, 기존 참가자는 기존 주소에서 PDF를 먼저 저장하세요.

## 로컬 확인

```bash
npm ci
npm run typecheck
npm test
npm run build
```

`npm run dev`는 화면 개발용 Vite 서버입니다. 서버 기능까지 로컬에서 확인하려면 `npx netlify-cli@latest dev`를 사용하세요.
`file://`로 `index.html`을 직접 여는 방식은 지원하지 않습니다.

실행 결과와 검증 범위는 `검증결과.txt`에 기록했습니다. 실제 Netlify 계정 배포·휴대폰 카메라·Google Drive 업로드는 배포 후 확인해야 합니다.

## 공식 배포 문서

- https://cli.netlify.com/commands/deploy/
- https://docs.netlify.com/api-and-cli-guides/cli-guides/manage-functions/
- https://docs.netlify.com/build/functions/configuration/
