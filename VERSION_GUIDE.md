# 버전 관리 가이드

## Semantic Versioning (SemVer) 규칙

프로젝트는 **Semantic Versioning (MAJOR.MINOR.PATCH)** 형식을 따릅니다.

### 버전 형식: `MAJOR.MINOR.PATCH`

- **MAJOR (주 버전)**: 호환되지 않는 API 변경이 있을 때 증가
  - 예: `1.0.0` → `2.0.0`
  - 기존 기능을 사용하는 코드가 작동하지 않을 수 있는 변경사항

- **MINOR (부 버전)**: 하위 호환되는 새로운 기능 추가 시 증가
  - 예: `1.0.0` → `1.1.0`
  - 새로운 기능이 추가되었지만 기존 기능은 그대로 작동

- **PATCH (수정 버전)**: 하위 호환되는 버그 수정 시 증가
  - 예: `1.0.0` → `1.0.1`
  - 버그 수정, 성능 개선 등

## 버전 업데이트 방법

### 1. 수동 업데이트

다음 파일들의 `version` 필드를 수정합니다:

- `package.json` (루트)
- `client/package.json`
- `server/package.json`

```json
{
  "version": "1.1.0"  // 원하는 버전으로 변경
}
```

### 2. npm 명령어 사용 (권장)

```bash
# 루트 디렉토리에서
npm version patch   # 1.0.0 → 1.0.1 (버그 수정)
npm version minor   # 1.0.0 → 1.1.0 (기능 추가)
npm version major   # 1.0.0 → 2.0.0 (대규모 변경)

# 특정 버전으로 설정
npm version 1.2.0
```

**주의**: `npm version` 명령어는 자동으로 Git 태그를 생성하고 커밋합니다.

### 3. 버전 업데이트 체크리스트

버전을 업데이트할 때 다음을 확인하세요:

- [ ] `package.json` (루트) 버전 업데이트
- [ ] `client/package.json` 버전 업데이트
- [ ] `server/package.json` 버전 업데이트
- [ ] `README.md`에 변경사항 반영 (필요시)
- [ ] Git 커밋 및 태그 생성

## 현재 버전: 1.1.0

### 변경 이력

- **1.1.0** (2025-01-XX): 연차/월차 관리 및 휴강 신청 기능 추가
- **1.0.0** (2024-11-28): 초기 릴리스

