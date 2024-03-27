/*
 * This file is part of KubeSphere Console.
 * Copyright (C) 2019 The KubeSphere Console Authors.
 *
 * KubeSphere Console is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * KubeSphere Console is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with KubeSphere Console.  If not, see <https://www.gnu.org/licenses/>.
 */
module.exports = {
  // Create Cluster
  SELECT_ADD_CLUSTER_METHOD: '클러스터를 추가하는 방법 선택',
  SELECT_ADD_CLUSTER_METHOD_DESC: '새 클러스터 추가 및 기존 클러스터 가져오기 지원',
  CLUSTER_NODE_SETTINGS_DESC: '클러스터에 노드 추가',
  K8S_CLUSTER_SETTINGS_DESC: '새 Kubernetes 클러스터를 처음 구성합니다.',
  CLUSTER_MAX_PODS_DESC: 'maxPods는이 Kubelet에서 실행할 수있는 최대 파드 수입니다. [기본값 : 110].',
  KUBE_PODS_CIDR_DESC: '노드에서 실행 중인 파드는 노드의 파드 CIDR 범위에서 IP 주소를 할당합니다.',
  KUBE_SERVICE_CIDR_DESC: '서비스에 할당된 IP 주소 범위입니다.',
  CLUSTER_COMPONENTS_DESC: '클러스터의 서비스 구성 요소를 커스터마이즈 합니다.',
  CLUSTER_ADVANCED_SETTINGS_DESC: '필요한 서비스를 사용자의 요구사항에 따라 구성할 수 있습니다.',
  CLUSTER_PRIVATE_REGISTRY_DESC: '클러스터의 개인 레지스트리를 구성합니다. 클러스터는 이 레지스트리를 사용하여 필요한 모든 미러를 가져옵니다.',
  CLUSTER_CONTROLPLANE_ENDPOINT: '클러스터 액세스 엔드포인트',
  CLUSTER_CONTROLPLANE_ENDPOINT_DESC: '인증된 클러스터 액세스 주소를 통해 클러스터와 직접 통신하고 클러스터가 클러스터에 액세스할 수 있도록 kubeconfig를 생성합니다.',
  CLUSTER_ETCD_BACKUP_DESC: 'etcd에 대해 백업 설정',
  CLUSTER_ETCD_BACKUP_DIR_DESC: 'etcd 호스트 시스템에 etcd 백업 파일을 저장할 위치입니다.',
  CLUSTER_ETCD_BACKUP_PERIOD_DESC: '백업 등의 작업을 실행하는 기간이며 단위는 분입니다.',
  CLUSTER_ETCD_BACKUP_NUMBER_DESC: '보관할 백업 복제본 수',
  CLUSTER_KUBESPHERE_SETTINGS_DESC: 'Petasus Kubernetes에 대한 사용자 지정 설정',
  MASTER_NODE_COUNT_TIP: '마스터 노드 수는 1개 또는 3개여야 합니다',
  WORKER_NODE_COUNT_TIP: '작업자 노드 수가 1개 이상입니다',
  HOW_TO_ADD: '추가 방법',
  DOMAIN: '도메인',
  // Add Node
  NODE_ROLE_EMPTY_DESC: '클러스터에서 노드의 역할을 설정하십시오.',
  EXTERNAL_IP: '외부 IP 주소',
  SSH_KEY_TCAP: 'SSH 키',
  SSH_KEY_SCAP: 'SSH 키',
  SSH_AUTH_MODE: 'SSH 인증 모드',
  NODE_INTERNAL_IP_DESC: 'Petasus Kubernetes 클러스터에 있는 노드의 내부 IP 주소를 설정합니다.',
  NODE_INTERNAL_IP_EMPTY_DESC: 'Petasus Kubernetes 클러스터에 있는 노드의 내부 IP 주소를 설정하십시오.',
  NODE_ROLE_DESC: '클러스터에서 노드의 역할을 설정합니다.',
  NODE_EXTERNAL_IP_DESC: 'SSH 로그인에 사용되는 노드 IP 주소와 포트 번호를 입력합니다.',
  NODE_EXTERNAL_IP_EMPTY_DESC: 'SSH 로그인에 사용되는 노드 IP 주소와 포트 번호를 입력하십시오.',
  SSH_AUTH_MODE_DESC: 'SSH 인증 모드를 선택합니다.',
  NODE_USERNAME_DESC: 'SSH 로그인에 사용되는 사용자 이름을 입력합니다.',
  NODE_PASSWORD_DESC: 'SSH 로그인에 사용되는 암호를 입력합니다.',
  ADD_NODE_TO_THE_CLUSTER: '클러스터에 노드 추가',
  // src/pages/workspaces/containers/Clusters
  WORKSPACE_CLUSTERS_DESC: '클러스터 정보는 작업 공간에서 클러스터 리소스가 사용되는 방식을 보여줍니다.',
  // src/pages/console/components/Cards/Workspace
  DEVOPS_PROJECT_NUMBER: '데브옵스 프로젝트',
  PROJECT_NUMBER: '프로젝트',
  VIEW_WORKSPACE: '워크스페이스 보기',
  MEMBERS: '회원',
  // src/components/Forms/Cluster/AdvanceSettings
  PRIVATE_REGISTRY: '개인 레지스트리',
  // src/pages/projects/containers/Alerting/Messages
  ALERT_TYPE: '{type} 알람',
  // src/pages/projects/containers/Applications/OPAppDetail/VersionInfo
  CURRENT_VERSION: '현재 버전',
  UPGRADE: '업그레이드',
  // src/utils/time.js
  DAYS: '일',
  WEEKS: '주',
  // components/Inputs/Upload
  FILE_OVERSIZED_TIP: '파일 크기는 2MB 미만이어야 합니다.',
  // pages/clusters/containers/Clusters/index.jsx
  NEW_CLUSTER: '신규 클러스터',
  IMPORT_CLUSTER: '가져온 클러스터',
  // src/components/Forms/Cluster/BaseInfo/index.jsx
  NODE_SETTINGS: '노드 설정',
  PLEASE_ADD_AT_LEAST_ONE_CLUSTER_NODE: '하나 이상의 클러스터 노드를 추가하십시오',
  // src/components/Forms/Cluster/ClusterSettings
  NETWORK_PLUGIN: '네트워크 플러그인',
  MAX_PODS: ' 최대 Pods',
  PODS_CIDR: '파드 CIDR',
  SERVICE_CIDR: '서비스 CIDR',
  DEFAULT_STORAGE_PLUGIN: '기본 스토리지 플러그인',
  // src/components/Forms/Cluster/AdvanceSettings
  PRIVATE_REGISTRY_CONFIGURATION: '개인 레지스트리 설정',
  ETCD_BACKUP: 'etcd 백업',
  ETCD_BACKUP_DIR: 'etcd 백업 디렉토리',
  ETCD_BACKUP_PERIOD: 'etcd 백업 기간 ',
  KEEP_BACKUP_NUMBER: '백업 개수 유지',
  KUBESPHERE_SETTINGS: 'Petasus Kubernetes 설정',
  // src/clusters/components/Modals/AddNodeType
  ADD_NODE_TYPE: '노드 유형 추가',
  NODE_TYPE_DESCRIPTION_DEC: '이 설명은 사용자가 노드 유형을 선택하고 클러스터를 사용하는 데 도움이 됩니다.',
  TYPE_NAME: '유형 이름',
  // src/pages/projects/components/Modals/RebuildS2i
  REPO_URL: '저장소 URL',
  REVISION_ID: '리비전 ID',
  // src/pages/settings/containers/ThirdPartyLogin/index.jsx
  CONFIGURE: '환경설정',
  CURRENT_THIRD_PARTY_LOGIN_CONFIGURATIONS: '서드파티 로그인 설정',
  NOT_CONFIGURED: '설정되지 않음',
  PLEASE_INPUT_CLIENT_ID: '클라이언트 ID를 입력하십시오',
  PLEASE_INPUT_SERVER_ADDRESS: '서버 주소를 입력하십시오',
  PROTOCOL_TYPE: '프로토콜 유형',
  SERVER_ADDRESS: '서버 주소',
  THIRD_PARTY_LOGIN: '서드파티 로그인',
  THIRD_PARTY_LOGIN_DESC: '로그인을 위해 서드파티 서비스를 사용하는 경우, 사용자는 관련 정보를 입력해야 합니다. 그런 다음 환경에서 보안 로그인을 위해 사용자와 연결된 로컬 사용자가 생성됩니다.',
  THIRD_PARTY_LOGIN_Q: '로그인을 지원하는 서드파티는 어떤것들이 있나요?',
  THIRD_PARTY_LOGIN_A: 'LDAP, AD, OAuth 및 Github OAuth가 지원됩니다.',
  OAUTH_DESC: 'OAuth는 사용자가 리소스에 액세스할 수 있도록 쉽고 안전한 방법을 제공하는 개방형 표준입니다.',
  GITHUB_OAUTH_DESC: 'GitHub OAuth는 조직 구성원 자격을 기반으로 액세스 권한을 부여합니다.',
  CLIENT_ID: '클라이언트 ID',
  PLEASE_INPUT_CLIENT_ID: '클라이언트 ID를 입력하십시오.',
  HOW_TO_OBTAIN_A_GITHUB_CLIENT_ID: 'GitHub 클라이언트 ID를 얻는 방법은 무엇입니까?',
  SERVER_ADDRESS: '서버 주소',
  PLEASE_INPUT_SERVER_ADDRESS: '서버 주소를 입력하십시오.',
  CLIENT_SECRET: '클라이언트 시크릿',
  // src/pages/projects/components/Modals/ModifyMember
  MODIFY_MEMBER_ROLE: '구성원 역할 수정'
};
