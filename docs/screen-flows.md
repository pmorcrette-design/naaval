# Key User Flows

## Operations flow

### 1. Order intake

- Import orders from merchant API, CSV, or manual entry
- Validate geocodes, time windows, and parcel dimensions
- Flag invalid orders before planning

### 2. Planning

- Select date, hub, and planning wave
- Choose eligible shifts and vehicle pools
- Run GraphHopper optimization
- Review unassigned jobs and overloaded routes
- Apply manual adjustments if needed

### 3. Dispatch

- Lock approved routes
- Assign routes to drivers
- Push route packages to the carrier app
- Trigger merchant and customer notifications

### 4. Live operations

- Monitor route progress and live positions
- Detect SLA risks and stalled routes
- Reassign jobs or re-optimize when incidents happen
- Manage customer support calls and failed attempts

## Carrier app flow

### 1. Shift start

- Driver logs in
- Selects vehicle and starts shift
- Completes a lightweight checklist if required
- Downloads assigned route package for offline use

### 2. Route execution

- Driver sees ordered stop list and map
- Taps next stop
- Opens navigation in preferred maps app
- Marks arrival and service start

### 3. Delivery proof

- Scan parcel if applicable
- Collect OTP, signature, or photo based on merchant rules
- Mark delivered
- Sync proof immediately or queue it offline

### 4. Exception handling

- Mark failed stop with reason code
- Capture photo and note
- Request operator help if needed
- Continue route with minimal friction

## Driver UX principles

- One primary action per screen
- Large buttons for on-road usage
- Minimal keyboard usage
- Clear offline state
- Visible next stop and SLA urgency
- Fast exception reporting

